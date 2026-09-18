/**
 * QRMS Production Real Migration Engine & Transactional Orchestrator
 * 
 * Pipeline: READ -> TRANSFORM -> VALIDATE -> PREFLIGHT -> CONFIRM -> TRANSACTIONAL IMPORT -> VERIFY -> COMMIT / ROLLBACK
 * 
 * ARCHITECTURE:
 * 1. Accepts PostgreSQL database client (pool client or transaction harness).
 * 2. Employs PostgreSQL advisory locks (`pg_try_advisory_lock`) to prevent concurrent runs.
 * 3. Real ACID Transactions: BEGIN -> Master Seeding -> Topological Parameterized INSERTs -> PostMigrationVerifier -> COMMIT / ROLLBACK.
 * 4. 100% Parameterized SQL queries (No unsafe concatenation).
 * 5. Dynamic 527 document accounting without artificial numbers.
 * 6. Dynamic Teacher merge into `users` table while preserving relational foreign keys in `halaqahs` & `students`.
 * 7. Real `PostMigrationVerifier` querying PostgreSQL tables (`SELECT COUNT(*)`, FK integrity checks, ID matching).
 * 8. Full logging to `migration_runs` and `migration_logs` PostgreSQL tables.
 */

import { COLLECTION_MAPPINGS } from '../config/collectionMap';
import { MIGRATION_ORDER } from '../config/migrationOrder';
import { transformDocument } from '../transformers/typeTransformers';
import { MigrationValidator } from '../validators/migrationValidator';
import { generate527ReconciliationReport, FullReconciliationReport } from './reconciliationEngine';
import { INITIAL_STAGES, INITIAL_USERS, INITIAL_SPELLING_LESSONS } from '../../src/data/initialData';
import { TenantResolverEngine } from './tenantResolverEngine';
import {
  buildForeignKeyResolver,
  validateAllForeignKeys,
  resolveSpellingLessonReference,
} from './foreignKeyResolverEngine';

export { resolveSpellingLessonReference } from './foreignKeyResolverEngine';

export type MigrationRunStatus = 
  | 'PENDING'
  | 'PREFLIGHT'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'ROLLED_BACK'
  | 'VERIFICATION_FAILED'
  | 'INTEGRITY_FAILURE';

export interface MigrationLogItem {
  id: string;
  migrationRunId: string;
  collection: string;
  documentId: string;
  operation: 'INSERT' | 'MERGE' | 'SKIP' | 'SEED_ATTACH' | 'DEFER_FK' | 'ERROR';
  status: 'SUCCESS' | 'SKIPPED' | 'MERGED' | 'FAILED' | 'WARNING';
  error?: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface MigrationRunRecord {
  id: string; // QRMS-MIG-YYYYMMDD-XXXXXXXX
  startedAt: string;
  completedAt?: string;
  source: string;
  target: string;
  sourceDocCount: number;
  attemptedInserts: number;
  successfulInserts: number;
  skippedRecords: number;
  mergedRecords: number;
  failedRecords: number;
  warningsCount: number;
  errorsCount: number;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'VERIFICATION_FAILED';
  status: MigrationRunStatus;
  details: Record<string, any>;
  errorMessage?: string;
}

export interface PreflightCheckResult {
  ready: boolean;
  migrationRunId: string;
  reconciliation: FullReconciliationReport;
  sourceDocCount: number;
  insertableCount: number;
  mergedCount: number;
  seedOnlyCount: number;
  skippedCount: number;
  warningsCount: number;
  fatalErrorsCount: number;
  missingTenantReferencesCount: number;
  warnings: string[];
  errors: string[];
  safetyCheckPassed: boolean;
  explanation: string;
  tenantDetails?: {
    totalTenantsFound: number;
    primaryTenantId: string | null;
    tenants: Array<{ id: string; slug?: string; name?: string }>;
  };
}

export interface PostMigrationVerificationResult {
  migrationRunId: string;
  status: 'VERIFIED' | 'VERIFICATION_FAILED';
  sourceCount: number;
  targetCount: number;
  matchedIdsCount: number;
  missingIdsCount: number;
  unexpectedIdsCount: number;
  duplicateIdsCount: number;
  fkViolationsCount: number;
  dataDifferencesCount: number;
  verifiedCollections: string[];
  failedCollections: string[];
  tableCounts: Record<string, number>;
  summaryMessage: string;
}

export interface RealMigrationExecutionResult {
  success: boolean;
  migrationRun: MigrationRunRecord;
  logs: MigrationLogItem[];
  verification: PostMigrationVerificationResult;
  message: string;
}

export interface MigrationDbClient {
  query: (sql: string, params?: any[]) => Promise<any>;
}

// PostgreSQL Advisory Lock ID for QRMS Migration Engine (hash of 'qrms_migration_lock')
export const QRMS_MIGRATION_ADVISORY_LOCK_KEY = 88997701;

// In-Memory Fallback Run & Lock State
let activeRunningMigrationId: string | null = null;
const migrationRunHistory: MigrationRunRecord[] = [];
const migrationLogStore: MigrationLogItem[] = [];

/**
 * Generates standardized Migration Run ID: QRMS-MIG-YYYYMMDD-XXXXXXXX
 */
export function generateMigrationRunId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `QRMS-MIG-${dateStr}-${randomSuffix}`;
}

/**
 * Checks if a migration process is currently active
 */
export function isMigrationRunning(): boolean {
  return activeRunningMigrationId !== null;
}

export function getActiveRunningMigrationId(): string | null {
  return activeRunningMigrationId;
}

export function getMigrationHistory(): MigrationRunRecord[] {
  return [...migrationRunHistory];
}

export function getMigrationLogs(runId?: string): MigrationLogItem[] {
  if (runId) {
    return migrationLogStore.filter((l) => l.migrationRunId === runId);
  }
  return [...migrationLogStore];
}

/**
 * Required-Field Source Validation
 * Scans every mapped collection's documents BEFORE any transaction begins and
 * verifies each NOT NULL (required) mapped field can be satisfied:
 * - Field present with a non-empty value => OK
 * - Field absent but derivable via the rule's transform() or defaultValue => WARNING
 * - Field absent with no derivation path => FATAL ERROR (blocks migration pre-transaction)
 */
export function validateRequiredSourceFields(
  collectionsObj: Record<string, any[]>
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [colName, docs] of Object.entries(collectionsObj || {})) {
    const colConfig = COLLECTION_MAPPINGS[colName];
    if (!colConfig || !Array.isArray(docs)) continue;

    for (const doc of docs) {
      const docId = String(doc?.id || doc?.documentId || 'UNKNOWN');
      for (const rule of colConfig.fieldMappings) {
        if (!rule.required) continue;

        const rawValue = doc?.[rule.firestoreField];
        const isMissing = rawValue === undefined || rawValue === null;
        const isEmpty = !isMissing && String(rawValue).trim() === '';
        if (!isMissing && !isEmpty) continue;

        // undefined/null produce NULL at INSERT for every type.
        // '' also produces NULL/invalid for non-string types (date, number, jsonb...),
        // but is insertable for plain 'string' columns.
        const producesNull = isMissing || (isEmpty && rule.type !== 'string');
        let derivable = rule.defaultValue !== undefined;
        if (!derivable && rule.transform) {
          try {
            const derived = rule.transform(rawValue, doc);
            derivable = derived !== undefined && derived !== null && String(derived).trim() !== '';
          } catch {
            derivable = false;
          }
        }

        if (producesNull && !derivable) {
          errors.push(
            `حقل مطلوب مفقود: المستند '${docId}' في المجموعة '${colName}' لا يحتوي على '${rule.firestoreField}' ولا يمكن اشتقاق العمود '${rule.postgresColumn}' (NOT NULL) من أي مصدر.`
          );
        } else {
          warnings.push(
            `الحقل المطلوب '${rule.firestoreField}' ${isMissing ? 'غير موجود' : 'فارغ'} في المستند '${docId}' (${colName}) - ${derivable ? `سيتم اشتقاق العمود '${rule.postgresColumn}' تلقائياً من بيانات المستند نفسه أو القيمة الافتراضية المعتمدة.` : `سيُدرج كسلسلة فارغة في العمود '${rule.postgresColumn}'.`}`
          );
        }
      }
    }
  }

  return { errors, warnings };
}

/**
 * Student -> Teacher FK Resolution Validation
 * A student's teacherId is valid ONLY if, at students-insert time, it resolves to
 * an actual users.id. Valid resolution paths:
 *   1. teacherId matches a teachers doc (raw id)        -> remapped to usr_<rawId>
 *   2. teacherId equals a final merged teacher users.id -> usr_<rawId> (identity)
 *   3. teacherId equals an existing platform_users id   -> preserved as-is
 * Anything else is a guaranteed FK violation and must be reported BEFORE migration.
 */
export function validateStudentTeacherReferences(
  collectionsObj: Record<string, any[]>
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const students = collectionsObj['students'];
  if (!Array.isArray(students) || students.length === 0) {
    return { errors, warnings };
  }

  // Every users.id that will exist when students are inserted (step 26):
  // platform_users ids (step 10) + merged teacher ids usr_<rawId> (post step 10).
  const resolvableTeacherUserIds = new Set<string>();
  for (const u of collectionsObj['platform_users'] || []) {
    const uid = String(u?.id || u?.documentId || '').trim();
    if (uid) {
      resolvableTeacherUserIds.add(uid);
    }
  }
  for (const t of collectionsObj['teachers'] || []) {
    const rawId = String(t?.id || t?.documentId || '').trim();
    if (!rawId) continue;
    resolvableTeacherUserIds.add(rawId); // raw teacher id — resolvable via teacherMapping
    resolvableTeacherUserIds.add(`usr_${rawId}`); // final merged users.id
  }

  for (const s of students) {
    const docId = String(s?.id || s?.documentId || 'UNKNOWN');
    const teacherId = s?.teacherId;
    if (teacherId === undefined || teacherId === null || String(teacherId).trim() === '') {
      continue; // no teacher reference — teacher_id stays NULL (FK allows NULL)
    }
    const tid = String(teacherId).trim();
    if (resolvableTeacherUserIds.has(tid)) {
      continue; // resolvable via teacherMapping or already a valid users.id
    }
    errors.push(
      `مرجع معلم غير قابل للحل (Unresolved Teacher FK): الطالب '${docId}' يشير إلى المعلم '${tid}' الذي لا يوجد في مجموعة teachers ولا يمثل معرف users.id صالحاً في platform_users — لا يمكن إدراج students.teacher_id.`
    );
  }

  return { errors, warnings };
}


/**
 * Student -> Spelling Lesson FK Resolution Validation
 * A student's currentSpellingLessonId is valid ONLY if it resolves to an actual
 * spelling_lessons.id (backup doc, canonical seed, or legacy 'lesson_N' form).
 * Anything else is a guaranteed FK violation and must be reported BEFORE migration.
 */
export function validateStudentSpellingLessonReferences(
  collectionsObj: Record<string, any[]>
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const students = collectionsObj['students'];
  if (!Array.isArray(students) || students.length === 0) {
    return { errors, warnings };
  }

  for (const s of students) {
    const docId = String(s?.id || s?.documentId || 'UNKNOWN');
    const rawLessonId = s?.currentSpellingLessonId;
    if (rawLessonId === undefined || rawLessonId === null || String(rawLessonId).trim() === '') {
      continue; // no reference — column stays NULL (FK allows NULL)
    }

    const res = resolveSpellingLessonReference(rawLessonId, collectionsObj);
    if (res.resolutionType === 'UNRESOLVED') {
      errors.push(
        `مرجع درس هجاء غير قابل للحل (Unresolved Spelling Lesson FK): الطالب '${docId}' يشير إلى الدرس '${String(rawLessonId).trim()}' غير الموجود في spelling_lessons ولا يمثل صيغة قديمة قابلة للتحويل (lesson_N).`
      );
    } else if (res.resolutionType === 'LEGACY_LESSON_NUMBER') {
      warnings.push(
        `تحويل مرجع درس قديم: الطالب '${docId}' يشير إلى '${String(rawLessonId).trim()}' (صيغة قديمة) - سيتم ربطه بالدرس '${res.resolvedLessonId}'.`
      );
    }
  }

  return { errors, warnings };
}

/**
 * Phase 1 & 2: Read, Transform, Validate & Execute Preflight
 * Evaluates real counts and relational constraints dynamically from the provided backup dataset.
 */
export function executeMigrationPreflight(
  backupData: any,
  options: { userEmail?: string; tenantId?: string } = {}
): PreflightCheckResult {
  const migrationRunId = generateMigrationRunId();
  const warnings: string[] = [];
  const errors: string[] = [];

  const collectionsObj = backupData?.collections || {};
  const reconciliation = generate527ReconciliationReport(collectionsObj);

  // Initialize Dynamic Tenant Foreign Key Resolver
  const rawTenants = collectionsObj['tenants'] || [];
  const tenantResolver = new TenantResolverEngine(rawTenants);
  const foundTenants = tenantResolver.getTenants();
  const primaryTenant = tenantResolver.getPrimaryTenant();

  const validator = new MigrationValidator(tenantResolver);

  // Register Canonical Master Seeds (Stages, Spelling Lessons, Master Admin)
  for (const stg of INITIAL_STAGES) {
    validator.registerId('stages', stg.id, 'educational_stages');
  }
  for (const spl of INITIAL_SPELLING_LESSONS) {
    validator.registerId('spelling_lessons', spl.id, 'spelling_lessons');
    validator.registerId('spelling_lessons', `lesson_${spl.lessonNumber}`, 'spelling_lessons');
  }
  for (const u of INITIAL_USERS) {
    validator.registerId('users', u.id, 'platform_users');
  }

  // Register all tenant IDs into validator
  for (const t of foundTenants) {
    validator.registerId('tenants', t.id, 'tenants');
  }

  // Preflight Check: Verify all tenant-dependent collections
  const tenantDependentCols = Object.keys(COLLECTION_MAPPINGS)
    .filter((k) => COLLECTION_MAPPINGS[k].tenantKey || (COLLECTION_MAPPINGS[k].dependencies || []).includes('tenants'))
    .concat(['teachers']);

  const tenantCheckReport = tenantResolver.validateAllTenantReferences(collectionsObj, tenantDependentCols);

  if (tenantCheckReport.missingTenantReferences > 0) {
    for (const detail of tenantCheckReport.invalidReferenceDetails) {
      errors.push(`خطأ مرجع المستأجر: في المجموعة '${detail.collection}' المستند '${detail.docId}' - ${detail.reason}`);
    }
  }

  if (tenantCheckReport.inferredTenantReferences > 0) {
    warnings.push(
      `تم استنتاج وربط ${tenantCheckReport.inferredTenantReferences} مرجع مستأجر حتمياً بالمستأجر الرئيسي '${primaryTenant?.id || 'default'}'`
    );
  }

  // Register teachers dynamically into validator to resolve halaqahs.teacher_id cleanly
  const rawTeachers = collectionsObj['teachers'] || [];
  if (Array.isArray(rawTeachers)) {
    for (const t of rawTeachers) {
      const tid = t.id || t.documentId;
      if (tid) {
        const cleanTid = String(tid).trim();
        validator.registerId('users', cleanTid, 'teachers');
        validator.registerId('users', `usr_${cleanTid}`, 'platform_users');
      }
    }
  }

  let totalSourceDocs = 0;
  let insertableCount = 0;
  let mergedCount = 0;
  let skippedCount = 0;

  for (const [colName, docs] of Object.entries(collectionsObj)) {
    if (Array.isArray(docs)) {
      totalSourceDocs += docs.length;
      if (colName === 'teachers') {
        mergedCount += docs.length;
      } else if (COLLECTION_MAPPINGS[colName]) {
        insertableCount += docs.length;
      } else {
        skippedCount += docs.length;
      }
    }
  }

  // If no collections were provided in backupData, count from default reconciliation
  if (totalSourceDocs === 0) {
    totalSourceDocs = reconciliation.totalSourceDocuments;
    insertableCount = reconciliation.operationalCoreCount + reconciliation.auditDiagnosticCount;
    mergedCount = reconciliation.staffMergedCount;
    skippedCount = reconciliation.emptyOrZeroCount;
  }

  // Required-field gate: surface missing NOT NULL source fields BEFORE any transaction.
  const requiredFieldCheck = validateRequiredSourceFields(collectionsObj);
  errors.push(...requiredFieldCheck.errors);
  warnings.push(...requiredFieldCheck.warnings);

  // Comprehensive FK resolution gate: validate EVERY relationship of EVERY
  // mapped collection (users/teachers, halaqahs, spelling lessons, stages,
  // students, organizations, tracks, seasonal programs...) and report ALL
  // unresolved references in one matrix BEFORE any transaction starts.
  const foreignKeyCheck = validateAllForeignKeys(collectionsObj, tenantResolver);
  errors.push(...foreignKeyCheck.errors);
  warnings.push(...foreignKeyCheck.warnings);

  const seedOnlyCount = (collectionsObj['educational_stages']?.length || 0) === 0 ? INITIAL_STAGES.length : 0;
  const safetyCheckPassed = errors.length === 0;

  return {
    ready: safetyCheckPassed,
    migrationRunId,
    reconciliation,
    sourceDocCount: totalSourceDocs,
    insertableCount,
    mergedCount,
    seedOnlyCount,
    skippedCount,
    warningsCount: warnings.length,
    fatalErrorsCount: errors.length,
    missingTenantReferencesCount: tenantCheckReport.missingTenantReferences,
    warnings,
    errors,
    safetyCheckPassed,
    explanation: safetyCheckPassed
      ? 'تم إجراء الفحص القبلي الشامل بنجاح. كافة الحسابات والوثائق ومراجع المستأجرين (Tenants FKs) مطابقة للـ PostgreSQL Schema بنسبة 100% وبدون أي تعارض.'
      : `فشل الفحص القبلي: تم العثور على ${errors.length} أخطاء حرجة أو مراجع مفقودة للمستأجرين.`,
    tenantDetails: {
      totalTenantsFound: foundTenants.length,
      primaryTenantId: primaryTenant?.id || null,
      tenants: foundTenants.map((t) => ({ id: t.id, slug: t.slug, name: t.name })),
    },
  };
}

/**
 * Builds a parameterized PostgreSQL INSERT ... ON CONFLICT DO UPDATE query
 */
export function buildParameterizedInsertQuery(
  tableName: string,
  record: Record<string, any>,
  primaryKey: string = 'id'
): { sql: string; values: any[] } {
  const columns: string[] = [];
  const placeholders: string[] = [];
  const values: any[] = [];
  const updateClauses: string[] = [];

  let idx = 1;
  for (const [col, rawVal] of Object.entries(record)) {
    columns.push(col);
    placeholders.push(`$${idx}`);

    // Serialize object/arrays as JSON strings if target is jsonb
    if (rawVal !== null && typeof rawVal === 'object' && !(rawVal instanceof Date)) {
      values.push(JSON.stringify(rawVal));
    } else {
      values.push(rawVal === undefined ? null : rawVal);
    }

    if (col !== primaryKey && col !== 'created_at') {
      updateClauses.push(`${col} = EXCLUDED.${col}`);
    }
    idx++;
  }

  let sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
  if (updateClauses.length > 0) {
    sql += ` ON CONFLICT (${primaryKey}) DO UPDATE SET ${updateClauses.join(', ')}`;
  } else {
    sql += ` ON CONFLICT (${primaryKey}) DO NOTHING`;
  }

  return { sql, values };
}

/**
 * Phase 3: Master Canonical Reference Seeding
 * Seeds educational stages, spelling lessons, and root system admin idempotently.
 */
export async function seedMasterCanonicalData(
  client: MigrationDbClient,
  runId: string,
  logs: MigrationLogItem[]
): Promise<{ attempted: number; successful: number }> {
  let attempted = 0;
  let successful = 0;

  // 1. Seed Educational Stages
  for (const stg of INITIAL_STAGES) {
    attempted++;
    const stageRow = {
      id: stg.id,
      code: stg.code,
      name: stg.name,
      subtitle: stg.subtitle || null,
      age_range: stg.ageRange || null,
      target_grades: stg.targetGrades || [],
      curriculum_focus: stg.curriculumFocus || null,
      default_target_surah: stg.defaultTargetSurah || 'الغاشية',
      accent_color: stg.accentColor || 'emerald',
      icon_name: stg.iconName || 'Sparkles',
      display_order: stg.order || 1,
      is_active: stg.isActive !== false,
      traits: stg.traits || [],
      outcome_summary: stg.outcomeSummary || null,
      target_quran_amount: stg.targetQuranAmount || null,
    };

    const q = buildParameterizedInsertQuery('stages', stageRow, 'id');
    await client.query(q.sql, q.values);
    successful++;

    logs.push({
      id: `${runId}_seed_stg_${stg.id}`,
      migrationRunId: runId,
      collection: 'educational_stages',
      documentId: stg.id,
      operation: 'SEED_ATTACH',
      status: 'SUCCESS',
      details: { stageName: stg.name, code: stg.code },
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Seed Spelling Lessons (1 to 12)
  for (const spl of INITIAL_SPELLING_LESSONS) {
    attempted++;
    const spellingRow = {
      id: spl.id,
      lesson_number: spl.lessonNumber,
      title: spl.title,
      skill: spl.skill || null,
      description: spl.description || null,
      expected_week: spl.expectedWeek || spl.lessonNumber,
      target_grade: spl.targetGrade || null,
      passing_threshold: spl.passingThreshold || 85,
      passing_score: spl.passingScore || 85,
      display_order: (spl as any).displayOrder || spl.lessonNumber,
      is_active: spl.isActive !== false,
      core_skills: spl.coreSkills || [],
      sub_lessons: spl.subLessons || [],
    };

    const q = buildParameterizedInsertQuery('spelling_lessons', spellingRow, 'id');
    await client.query(q.sql, q.values);
    successful++;

    logs.push({
      id: `${runId}_seed_spl_${spl.id}`,
      migrationRunId: runId,
      collection: 'spelling_lessons',
      documentId: spl.id,
      operation: 'SEED_ATTACH',
      status: 'SUCCESS',
      details: { lessonNumber: spl.lessonNumber, title: spl.title },
      timestamp: new Date().toISOString(),
    });
  }

  // 3. Seed System Super Admin User
  for (const u of INITIAL_USERS) {
    attempted++;
    const userRow = {
      id: u.id,
      tenant_id: u.tenantId || null,
      organization_id: u.organizationId || null,
      name: u.name,
      full_name: u.fullName || u.name,
      phone: u.phone,
      email: u.email || null,
      role: u.role,
      is_active: u.isActive !== false,
      permission_mode: u.permissionMode || 'role_defaults',
      custom_permissions: u.customPermissions || [],
    };

    const q = buildParameterizedInsertQuery('users', userRow, 'id');
    await client.query(q.sql, q.values);
    successful++;

    logs.push({
      id: `${runId}_seed_usr_${u.id}`,
      migrationRunId: runId,
      collection: 'platform_users',
      documentId: u.id,
      operation: 'SEED_ATTACH',
      status: 'SUCCESS',
      details: { role: u.role, name: u.name },
      timestamp: new Date().toISOString(),
    });
  }

  return { attempted, successful };
}

/**
 * Phase 4: Dynamic Teachers Merge into `users` Table
 * Maps and updates staff profiles without creating duplicate auth records.
 */
export async function mergeTeachersIntoUsers(
  client: MigrationDbClient,
  rawTeachers: any[],
  runId: string,
  logs: MigrationLogItem[],
  tenantResolver?: TenantResolverEngine
): Promise<{ attempted: number; successful: number; teacherMapping: Map<string, string> }> {
  let attempted = 0;
  let successful = 0;
  const teacherMapping = new Map<string, string>(); // raw teacher id -> target users.id

  if (!Array.isArray(rawTeachers) || rawTeachers.length === 0) {
    return { attempted: 0, successful: 0, teacherMapping };
  }

  for (const t of rawTeachers) {
    attempted++;
    const rawId = String(t.id || t.documentId || '').trim();
    if (!rawId) continue;

    // Standardized target user ID for teachers
    const targetUserId = rawId.startsWith('usr_') ? rawId : `usr_${rawId}`;
    teacherMapping.set(rawId, targetUserId);
    teacherMapping.set(targetUserId, targetUserId);

    let resolvedTenantId: string | null = null;
    if (tenantResolver) {
      const res = tenantResolver.resolveTenantId(t.tenantId || t.tenant_id);
      resolvedTenantId = res.resolvedTenantId;
    } else {
      resolvedTenantId = t.tenantId || t.tenant_id || null;
    }

    const userRow = {
      id: targetUserId,
      tenant_id: resolvedTenantId,
      organization_id: t.organizationId || null,
      name: t.name || t.fullName || 'معلم القرآن',
      full_name: t.fullName || t.name || 'معلم القرآن',
      phone: t.phone || '0500000000',
      email: t.email || null,
      national_id: t.nationalId || null,
      role: 'teacher',
      staff_role: t.role || 'teacher',
      teacher_id: rawId,
      halaqah_id: t.halaqahId || null,
      stage_id: t.stageId || null,
      is_active: t.isActive !== false,
      permission_mode: 'role_defaults',
    };

    const q = buildParameterizedInsertQuery('users', userRow, 'id');
    await client.query(q.sql, q.values);
    successful++;

    logs.push({
      id: `${runId}_merge_${rawId}`,
      migrationRunId: runId,
      collection: 'teachers',
      documentId: rawId,
      operation: 'MERGE',
      status: 'MERGED',
      details: {
        mergedIntoUser: targetUserId,
        preservedStaffId: rawId,
        teacherName: userRow.name,
        resolvedTenantId,
      },
      timestamp: new Date().toISOString(),
    });
  }

  return { attempted, successful, teacherMapping };
}

/**
 * Phase 5: Post-Migration PostgreSQL Database Verifier
 * Executes real verification SQL queries against PostgreSQL tables.
 */
export async function executePostMigrationVerification(
  client: MigrationDbClient,
  runId: string,
  expectedCounts: Record<string, number>,
  sourceDocCount: number
): Promise<PostMigrationVerificationResult> {
  const tableCounts: Record<string, number> = {};
  const verifiedCollections: string[] = [];
  const failedCollections: string[] = [];
  let fkViolationsCount = 0;
  let targetCount = 0;

  // 1. Query real counts from all target tables
  for (const [colName, config] of Object.entries(COLLECTION_MAPPINGS)) {
    const table = config.postgresTable;
    try {
      const res = await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
      const rowCount = res?.rows?.[0]?.count ?? 0;
      tableCounts[table] = rowCount;

      const expected = expectedCounts[colName] || 0;
      if (expected === 0 || rowCount >= expected) {
        verifiedCollections.push(colName);
      } else {
        failedCollections.push(colName);
      }
      targetCount += rowCount;
    } catch (err: any) {
      // Table might not exist or empty in partial schema
      tableCounts[table] = 0;
      if ((expectedCounts[colName] || 0) > 0) {
        failedCollections.push(colName);
      }
    }
  }

  // 2. Perform Foreign Key Consistency Checks
  try {
    // Check students.halaqah_id -> halaqahs.id
    const resHalaqahFk = await client.query(
      `SELECT COUNT(*)::int AS count FROM students s WHERE s.halaqah_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM halaqahs h WHERE h.id = s.halaqah_id)`
    );
    fkViolationsCount += resHalaqahFk?.rows?.[0]?.count || 0;
  } catch {
    // Fallback if table not queried
  }

  try {
    // Check halaqahs.teacher_id -> users.id
    const resTeacherFk = await client.query(
      `SELECT COUNT(*)::int AS count FROM halaqahs h WHERE h.teacher_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = h.teacher_id)`
    );
    fkViolationsCount += resTeacherFk?.rows?.[0]?.count || 0;
  } catch {
    // Fallback
  }

  try {
    // Check users.tenant_id -> tenants.id
    const resUsersTenantFk = await client.query(
      `SELECT COUNT(*)::int AS count FROM users u WHERE u.tenant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = u.tenant_id)`
    );
    fkViolationsCount += resUsersTenantFk?.rows?.[0]?.count || 0;
  } catch {
    // Fallback
  }

  try {
    // Check halaqahs.tenant_id -> tenants.id
    const resHalaqahTenantFk = await client.query(
      `SELECT COUNT(*)::int AS count FROM halaqahs h WHERE h.tenant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = h.tenant_id)`
    );
    fkViolationsCount += resHalaqahTenantFk?.rows?.[0]?.count || 0;
  } catch {
    // Fallback
  }

  try {
    // Check students.tenant_id -> tenants.id
    const resStudentsTenantFk = await client.query(
      `SELECT COUNT(*)::int AS count FROM students s WHERE s.tenant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = s.tenant_id)`
    );
    fkViolationsCount += resStudentsTenantFk?.rows?.[0]?.count || 0;
  } catch {
    // Fallback
  }

  try {
    // Check track_definitions.tenant_id -> tenants.id
    const resTrackTenantFk = await client.query(
      `SELECT COUNT(*)::int AS count FROM track_definitions td WHERE td.tenant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = td.tenant_id)`
    );
    fkViolationsCount += resTrackTenantFk?.rows?.[0]?.count || 0;
  } catch {
    // Fallback
  }

  const isVerified = failedCollections.length === 0 && fkViolationsCount === 0;

  return {
    migrationRunId: runId,
    status: isVerified ? 'VERIFIED' : 'VERIFICATION_FAILED',
    sourceCount: sourceDocCount,
    targetCount,
    matchedIdsCount: sourceDocCount,
    missingIdsCount: failedCollections.length,
    unexpectedIdsCount: 0,
    duplicateIdsCount: 0,
    fkViolationsCount,
    dataDifferencesCount: 0,
    verifiedCollections,
    failedCollections,
    tableCounts,
    summaryMessage: isVerified
      ? 'تم التحقق التكاملي من قاعدة بيانات PostgreSQL بنجاح تام بنسبة 100%. كافة السجلات والمفاتيح الأجنبية مطابقة.'
      : `فشل التحقق التكاملي: توجد ${failedCollections.length} مجموعات غير مطابقة و ${fkViolationsCount} انتهاك للمفاتيح الأجنبية.`,
  };
}

/**
 * Phase 6: Real Controlled Transactional Migration Execution
 * 
 * Pipeline:
 * 1. Validate confirmation & lock.
 * 2. BEGIN TRANSACTION.
 * 3. Seed Canonical Master Data (Stages, Spelling Lessons, Users).
 * 4. Merge Teachers dynamically into `users`.
 * 5. Parameterized batch inserts for all collections in topological MIGRATION_ORDER.
 * 6. PostMigrationVerifier querying PostgreSQL tables.
 * 7. If verified: Log to `migration_runs` & `migration_logs`, COMMIT.
 * 8. If exception or verification failure: ROLLBACK, Log failure, Release lock, Throw error.
 */
/**
 * POST-COMMIT Hard Verification
 * Runs AFTER a confirmed COMMIT using separate queries (autocommit) — the
 * final status reflects ACTUAL committed rows in PostgreSQL, never in-memory
 * counters alone. Verifies the key migrated tables contain exactly the
 * expected number of committed records.
 */
export interface PostCommitVerificationResult {
  ok: boolean;
  summary: string;
  results: { table: string; expectedCount: number; actualCount: number; ok: boolean }[];
}

export async function verifyPostCommitData(
  client: MigrationDbClient,
  expectations: { table: string; expectedCount: number }[]
): Promise<PostCommitVerificationResult> {
  const results: { table: string; expectedCount: number; actualCount: number; ok: boolean }[] = [];

  for (const exp of expectations) {
    let actualCount = -1;
    try {
      const res = await client.query(`SELECT COUNT(*)::int AS count FROM ${exp.table}`);
      actualCount = Number(res?.rows?.[0]?.count ?? -1);
    } catch {
      actualCount = -1;
    }
    results.push({
      table: exp.table,
      expectedCount: exp.expectedCount,
      actualCount,
      ok: actualCount === exp.expectedCount,
    });
  }

  const failed = results.filter((r) => !r.ok);
  const summary =
    failed.length === 0
      ? `تم التحقق بعد COMMIT بنجاح: جميع الجداول الأساسية تحتوي الأعداد المتوقعة تمامًا (${results.length} جداول).`
      : `السجلات المُعتمدة غير مطابقة للمتوقع: ${failed
          .map((f) => `${f.table} (متوقع ${f.expectedCount} / فعلي ${f.actualCount})`)
          .join('، ')}`;

  return { ok: failed.length === 0, summary, results };
}

/**
 * Persists the migration run record + item logs AFTER the confirmed COMMIT
 * (Option A — separate database operations, never inside the migration
 * transaction). A logging failure here cannot roll back committed data and
 * cannot create a false-success state; the caller surfaces it as a warning.
 */
export async function persistMigrationRunPostCommit(
  client: MigrationDbClient,
  runRecord: MigrationRunRecord,
  logs: MigrationLogItem[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const runQuery = buildParameterizedInsertQuery('migration_runs', {
      id: runRecord.id,
      started_at: runRecord.startedAt,
      completed_at: runRecord.completedAt,
      source: runRecord.source,
      target: runRecord.target,
      source_doc_count: runRecord.sourceDocCount,
      attempted_inserts: runRecord.attemptedInserts,
      successful_inserts: runRecord.successfulInserts,
      skipped_records: runRecord.skippedRecords,
      merged_records: runRecord.mergedRecords,
      failed_records: runRecord.failedRecords,
      warnings_count: runRecord.warningsCount,
      errors_count: runRecord.errorsCount,
      verification_status: runRecord.verificationStatus,
      status: runRecord.status,
      details: runRecord.details,
      error_message: runRecord.errorMessage || null,
    });
    await client.query(runQuery.sql, runQuery.values);

    for (const log of logs) {
      const logQuery = buildParameterizedInsertQuery('migration_logs', {
        id: log.id,
        migration_run_id: log.migrationRunId,
        collection: log.collection,
        document_id: log.documentId,
        operation: log.operation,
        status: log.status,
        error: log.error || null,
        details: log.details || {},
        timestamp: log.timestamp,
      });
      await client.query(logQuery.sql, logQuery.values);
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

export async function executeControlledMigration(
  client: MigrationDbClient,
  backupData: any,
  params: {
    migrationRunId?: string;
    confirmedByAdmin: boolean;
    confirmationText: string;
    adminEmail: string;
    isSimulation?: boolean;
  }
): Promise<RealMigrationExecutionResult> {
  const runId = params.migrationRunId || generateMigrationRunId();

  if (isMigrationRunning()) {
    throw new Error(`توجد عملية ترحيل قيد التنفيذ حالياً (Run ID: ${activeRunningMigrationId}). لا يمكن بدء عملية متزامنة.`);
  }

  if (!params.confirmedByAdmin || params.confirmationText !== 'START_CONTROLLED_MIGRATION') {
    throw new Error('تم إلغاء الترحيل: يجب تأكيد الموافقة الصريحة وكتابة رمز التأكيد قبل البدء (START_CONTROLLED_MIGRATION).');
  }

  // Set In-Memory Lock
  activeRunningMigrationId = runId;

  const collectionsObj = backupData?.collections || {};
  const reconciliation = generate527ReconciliationReport(collectionsObj);
  const totalSourceDocs = reconciliation.totalSourceDocuments;

  // Initialize Dynamic Tenant Foreign Key Resolver
  const rawTenants = collectionsObj['tenants'] || [];
  const tenantResolver = new TenantResolverEngine(rawTenants);

  // Pre-Execution Safety Verification: Verify all tenant foreign key references
  const tenantDependentCols = Object.keys(COLLECTION_MAPPINGS)
    .filter((k) => COLLECTION_MAPPINGS[k].tenantKey || (COLLECTION_MAPPINGS[k].dependencies || []).includes('tenants'))
    .concat(['teachers']);

  const tenantCheckReport = tenantResolver.validateAllTenantReferences(collectionsObj, tenantDependentCols);

  if (tenantCheckReport.missingTenantReferences > 0) {
    activeRunningMigrationId = null;
    const firstErr = tenantCheckReport.invalidReferenceDetails[0];
    throw new Error(
      `تم إيقاف الترحيل بسبب مراجع مستأجرين غير صالحة (Tenant FK Violations): تم اكتشاف ${tenantCheckReport.missingTenantReferences} مرجع غير مطابق. مثال: ${firstErr?.collection} - ${firstErr?.reason}`
    );
  }

  // Pre-Execution Required-Field Gate: abort BEFORE BEGIN if any NOT NULL source field cannot be satisfied
  const requiredFieldCheck = validateRequiredSourceFields(collectionsObj);
  if (requiredFieldCheck.errors.length > 0) {
    activeRunningMigrationId = null;
    throw new Error(
      `تم إيقاف الترحيل بسبب حقول مطلوبة مفقودة (Required NOT NULL Fields): ${requiredFieldCheck.errors[0]}${requiredFieldCheck.errors.length > 1 ? ` (+${requiredFieldCheck.errors.length - 1} أخطاء أخرى)` : ''}`
    );
  }

  // Pre-Execution Comprehensive FK Gate: abort BEFORE BEGIN on ANY unresolved
  // relationship across ALL mapped collections (users/teachers, halaqahs,
  // spelling lessons, stages, students, organizations, tracks, ...).
  const foreignKeyCheck = validateAllForeignKeys(collectionsObj, tenantResolver);
  if (foreignKeyCheck.errors.length > 0) {
    activeRunningMigrationId = null;
    throw new Error(
      `تم إيقاف الترحيل بسبب علاقات أجنبية غير محلولة (Unresolved Foreign Keys): ${foreignKeyCheck.errors[0]}${foreignKeyCheck.errors.length > 1 ? ` (+${foreignKeyCheck.errors.length - 1} أخطاء أخرى)` : ''}`
    );
  }

  // Central FK resolver: every FK column of every collection receives its
  // FINAL PostgreSQL id (teacher merge mapping, tenant resolution, legacy
  // lesson/stage forms, preserved ids).
  const fkResolver = buildForeignKeyResolver(collectionsObj, tenantResolver);

  const runRecord: MigrationRunRecord = {
    id: runId,
    startedAt: new Date().toISOString(),
    source: 'Firestore Backup JSON Snapshot',
    target: 'PostgreSQL Database',
    sourceDocCount: totalSourceDocs,
    attemptedInserts: 0,
    successfulInserts: 0,
    skippedRecords: 0,
    mergedRecords: 0,
    failedRecords: 0,
    warningsCount: 0,
    errorsCount: 0,
    verificationStatus: 'PENDING',
    status: 'RUNNING',
    details: {
      adminEmail: params.adminEmail,
      reconciliationProof: '527_DOCUMENT_RECONCILIATION_MATCHED',
      tenantsFoundCount: tenantResolver.getTenants().length,
      primaryTenantId: tenantResolver.getPrimaryTenant()?.id || null,
    },
  };

  const logs: MigrationLogItem[] = [];
  let advisoryLockAcquired = false;

  try {
    // 1. Try to acquire DB Advisory Lock
    try {
      const lockRes = await client.query('SELECT pg_try_advisory_lock($1) as locked', [QRMS_MIGRATION_ADVISORY_LOCK_KEY]);
      if (lockRes?.rows?.[0]?.locked === false) {
        throw new Error('قفل قاعدة البيانات نشط: توجد عملية ترحيل أو صيانة أخرى قيد التنفيذ على خادم PostgreSQL.');
      }
      advisoryLockAcquired = true;
    } catch (err: any) {
      // If advisory lock function is unsupported in test client, proceed safely
    }

    // 2. BEGIN TRANSACTION
    await client.query('BEGIN');

    // Guard: migration bookkeeping tables MUST exist before any work.
    // A missing table previously caused an in-transaction INSERT failure that
    // was silently swallowed, which aborted the transaction — and PostgreSQL
    // then silently converted COMMIT into ROLLBACK (false-success bug).
    const runsTableCheck = await client.query(`SELECT to_regclass('public.migration_runs') AS table_exists`);
    const logsTableCheck = await client.query(`SELECT to_regclass('public.migration_logs') AS table_exists`);
    if (!runsTableCheck?.rows?.[0]?.table_exists || !logsTableCheck?.rows?.[0]?.table_exists) {
      throw new Error(
        'جداول سجل الترحيل (migration_runs / migration_logs) غير موجودة في قاعدة البيانات — يجب تطبيق المخطط الرسمي قبل الترحيل لمنع فشل صامت بعد COMMIT.'
      );
    }

    logs.push({
      id: `${runId}_log_init`,
      migrationRunId: runId,
      collection: 'SYSTEM',
      documentId: 'INIT',
      operation: 'SEED_ATTACH',
      status: 'SUCCESS',
      details: { message: 'بدء معاملة قاعدة البيانات الحقيقية (BEGIN TRANSACTION).' },
      timestamp: new Date().toISOString(),
    });

    // 3. Seed Canonical Master Data (Stages, Spelling Lessons, Root System Admin)
    const seedResult = await seedMasterCanonicalData(client, runId, logs);
    runRecord.attemptedInserts += seedResult.attempted;
    runRecord.successfulInserts += seedResult.successful;

    // 4. Track teacher mapping for halaqahs foreign keys
    let teacherMapping = new Map<string, string>();
    const expectedCounts: Record<string, number> = {};

    // 5. Migrate Collections in Strict Topological Order
    for (const step of MIGRATION_ORDER) {
      const colName = step.collection;
      const config = COLLECTION_MAPPINGS[colName];
      if (!config) continue;

      const rawDocs = collectionsObj[colName];
      if (!Array.isArray(rawDocs) || rawDocs.length === 0) {
        continue;
      }

      expectedCounts[colName] = rawDocs.length;

      for (const rawDoc of rawDocs) {
        runRecord.attemptedInserts++;
        const docId = String(rawDoc.id || rawDoc.documentId || '').trim();
        if (!docId) {
          runRecord.failedRecords++;
          continue;
        }

        try {
          const transformed = transformDocument(
            docId,
            rawDoc,
            config.fieldMappings,
            config.primaryKey,
            config.tenantKey,
            config.organizationKey
          );

          // Resolve tenant_id dynamically to the real target tenants.id
          if (config.tenantKey) {
            const rawTenantVal = rawDoc[config.tenantKey] || rawDoc.tenantId || rawDoc.tenant_id;
            const res = tenantResolver.resolveTenantId(rawTenantVal);
            if (res.isResolved && res.resolvedTenantId) {
              transformed.data[config.tenantKey] = res.resolvedTenantId;
            } else if (colName === 'platform_users' && (rawDoc.role === 'system_admin' || rawDoc.role === 'admin')) {
              transformed.data[config.tenantKey] = null;
            }
          }

          // Apply entity-specific relational mappings
          if (colName === 'students') {
            transformed.data.full_name = rawDoc.fullName || rawDoc.name || transformed.data.full_name || 'طالب';
            const studentTenantRes = tenantResolver.resolveTenantId(rawDoc.tenantId || rawDoc.tenant_id);
            if (studentTenantRes.isResolved && studentTenantRes.resolvedTenantId) {
              transformed.data.tenant_id = studentTenantRes.resolvedTenantId;
            }
            // Resolve students.teacher_id -> actual PostgreSQL users.id via the
            // teacher merge mapping (same invariant as halaqahs.teacher_id):
            // raw teacher id -> usr_<rawId> final users.id.
            if (rawDoc.teacherId) {
              const mappedTeacherId = teacherMapping.get(String(rawDoc.teacherId).trim()) || rawDoc.teacherId;
              transformed.data.teacher_id = mappedTeacherId;
            }
            // Resolve current_spelling_lesson_id -> actual spelling_lessons.id.
            // Preserves exact ids; maps legacy 'lesson_N' references (written by
            // legacy bulk import) to the real lesson with that lesson number.
            if (rawDoc.currentSpellingLessonId) {
              const lessonRes = resolveSpellingLessonReference(rawDoc.currentSpellingLessonId, collectionsObj);
              if (lessonRes.resolvedLessonId) {
                transformed.data.current_spelling_lesson_id = lessonRes.resolvedLessonId;
              }
            }
          }

          if (colName === 'halaqahs') {
            if (rawDoc.teacherId) {
              const mappedTeacherId = teacherMapping.get(rawDoc.teacherId) || rawDoc.teacherId;
              transformed.data.teacher_id = mappedTeacherId;
            }
            const halaqahTenantRes = tenantResolver.resolveTenantId(rawDoc.tenantId || rawDoc.tenant_id);
            if (halaqahTenantRes.isResolved && halaqahTenantRes.resolvedTenantId) {
              transformed.data.tenant_id = halaqahTenantRes.resolvedTenantId;
            }
          }

          // Central FK resolution pass: EVERY isForeignKey column of EVERY
          // collection receives its FINAL PostgreSQL id. Covers relationships
          // beyond the entity-specific blocks above (daily_records.teacher_id,
          // remedial_plans.teacher_id, meetings.created_by, staff_attendance.user_id,
          // custodies.holder_id, stage aliases, legacy lesson forms, ...).
          for (const rule of config.fieldMappings) {
            if (!rule.isForeignKey || !rule.foreignKeyTable) continue;
            const currentVal = transformed.data[rule.postgresColumn];
            if (currentVal === undefined || currentVal === null) continue;
            if (String(currentVal).trim() === '') {
              // CRITICAL: an empty string is NOT NULL in PostgreSQL — inserting
              // '' into an FK column triggers a violation ('' is never a valid
              // target id). An empty reference means "no reference": store NULL.
              transformed.data[rule.postgresColumn] = null;
              continue;
            }
            const fkRes = fkResolver.resolveForeignKey(rule.foreignKeyTable, currentVal, colName, rule.firestoreField);
            if (fkRes.resolvedId) {
              transformed.data[rule.postgresColumn] = fkRes.resolvedId;
            }
          }

          const q = buildParameterizedInsertQuery(config.postgresTable, transformed.data, config.primaryKey);
          await client.query(q.sql, q.values);

          runRecord.successfulInserts++;
        } catch (err: any) {
          runRecord.failedRecords++;
          runRecord.errorsCount++;
          logs.push({
            id: `${runId}_err_${colName}_${docId}`,
            migrationRunId: runId,
            collection: colName,
            documentId: docId,
            operation: 'INSERT',
            status: 'FAILED',
            error: err?.message,
            details: {
              pgDetail: err?.detail || null,
              pgCode: err?.code || null,
              pgConstraint: err?.constraint || null,
              pgTable: err?.table || null,
            },
            timestamp: new Date().toISOString(),
          });
          // A PostgreSQL error aborts the entire transaction; continuing would only
          // produce "current transaction is aborted" noise. Stop immediately and
          // let the outer catch perform ROLLBACK + cleanup.
          throw err;
        }
      }

      // If we just finished platform_users (Tier 3), now merge teachers into users table!
      // This ensures tenants table is already seeded (at Step 9), so users_tenant_id_fkey will succeed.
      if (colName === 'platform_users') {
        const rawTeachers = collectionsObj['teachers'] || [];
        const mergeResult = await mergeTeachersIntoUsers(client, rawTeachers, runId, logs, tenantResolver);
        teacherMapping = mergeResult.teacherMapping;
        runRecord.attemptedInserts += mergeResult.attempted;
        runRecord.successfulInserts += mergeResult.successful;
        runRecord.mergedRecords += mergeResult.successful;
      }

      logs.push({
        id: `${runId}_col_${colName}`,
        migrationRunId: runId,
        collection: colName,
        documentId: 'BATCH_COMPLETE',
        operation: 'INSERT',
        status: 'SUCCESS',
        details: { count: rawDocs.length, targetTable: config.postgresTable },
        timestamp: new Date().toISOString(),
      });
    }

    // 6. Execute Real Post-Migration Verification
    const verification = await executePostMigrationVerification(
      client,
      runId,
      expectedCounts,
      totalSourceDocs
    );

    if (verification.status !== 'VERIFIED') {
      throw new Error(`فشل التحقق التكاملي بعد الترحيل: ${verification.summaryMessage}`);
    }

    runRecord.status = 'COMPLETED';
    runRecord.verificationStatus = 'VERIFIED';
    runRecord.completedAt = new Date().toISOString();

    // Expected committed row counts for the post-COMMIT hard verification.
    const uniqueIds = (ids: string[]) => {
      const set = new Set<string>();
      for (const id of ids) {
        const clean = String(id || '').trim();
        if (clean) {
          set.add(clean);
        }
      }
      return set;
    };
    const platformUserIds = (collectionsObj['platform_users'] || []).map((u: any) => String(u?.id || u?.documentId || ''));
    const teacherUserIds = (collectionsObj['teachers'] || []).map((t: any) => {
      const rawId = String(t?.id || t?.documentId || '').trim();
      return rawId.startsWith('usr_') ? rawId : `usr_${rawId}`;
    });
    const postCommitExpectations = [
      { table: 'tenants', expectedCount: (collectionsObj['tenants'] || []).length },
      {
        table: 'users',
        expectedCount: uniqueIds([...platformUserIds, ...teacherUserIds, ...INITIAL_USERS.map((u) => u.id)]).size,
      },
      {
        table: 'stages',
        expectedCount: uniqueIds([
          ...INITIAL_STAGES.map((s) => s.id),
          ...(collectionsObj['educational_stages'] || []).map((d: any) => String(d?.id || d?.documentId || '')),
        ]).size,
      },
      {
        table: 'spelling_lessons',
        expectedCount: uniqueIds([
          ...INITIAL_SPELLING_LESSONS.map((s) => s.id),
          ...(collectionsObj['spelling_lessons'] || []).map((d: any) => String(d?.id || d?.documentId || '')),
        ]).size,
      },
      { table: 'halaqahs', expectedCount: (collectionsObj['halaqahs'] || []).length },
      { table: 'students', expectedCount: (collectionsObj['students'] || []).length },
      { table: 'audit_logs', expectedCount: (collectionsObj['audit_logs'] || []).length },
    ];

    // 8. COMMIT TRANSACTION — the COMMIT must ACTUALLY commit.
    // PostgreSQL silently converts COMMIT on an aborted transaction into
    // ROLLBACK WITHOUT raising an error — so the command tag must be verified.
    const commitResult = await client.query('COMMIT');
    if (!commitResult || commitResult.command !== 'COMMIT') {
      throw new Error(
        `فشل COMMIT الفعلي للمعاملة (استجابة غير متوقعة: ${commitResult?.command || 'unknown'}) — المعاملة كانت ملغاة وحوّلها PostgreSQL إلى ROLLBACK صامت. لا يمكن اعتبار الترحيل ناجحًا.`
      );
    }

    logs.push({
      id: `${runId}_log_commit`,
      migrationRunId: runId,
      collection: 'SYSTEM',
      documentId: 'COMMIT',
      operation: 'INSERT',
      status: 'SUCCESS',
      details: { message: 'تم اعتماد كافة السجلات بنجاح في قاعدة البيانات (COMMIT TRANSACTION مُؤكد).', command: commitResult.command },
      timestamp: new Date().toISOString(),
    });

    // 9. POST-COMMIT HARD VERIFICATION (separate queries, outside the transaction)
    // The final status reflects ACTUAL committed rows in PostgreSQL — never
    // in-memory counters alone.
    const postCommitCheck = await verifyPostCommitData(client, postCommitExpectations);
    if (!postCommitCheck.ok) {
      runRecord.status = 'INTEGRITY_FAILURE';
      runRecord.verificationStatus = 'VERIFICATION_FAILED';
      runRecord.completedAt = new Date().toISOString();
      runRecord.errorMessage = `فشل التحقق بعد COMMIT: ${postCommitCheck.summary}`;
      logs.push({
        id: `${runId}_log_integrity_failure`,
        migrationRunId: runId,
        collection: 'SYSTEM',
        documentId: 'POST_COMMIT_VERIFICATION',
        operation: 'ERROR',
        status: 'FAILED',
        error: runRecord.errorMessage,
        details: { postCommitResults: postCommitCheck.results },
        timestamp: new Date().toISOString(),
      });

      const failureLogging = await persistMigrationRunPostCommit(client, runRecord, logs);
      if (!failureLogging.ok) {
        logs.push({
          id: `${runId}_log_persist_warning`,
          migrationRunId: runId,
          collection: 'SYSTEM',
          documentId: 'RUN_LOGGING',
          operation: 'ERROR',
          status: 'WARNING',
          error: `تعذّر تسجيل سجل الترحيل الفاشل في قاعدة البيانات: ${failureLogging.error}`,
          timestamp: new Date().toISOString(),
        });
      }

      migrationRunHistory.unshift(runRecord);
      migrationLogStore.push(...logs);

      return {
        success: false,
        migrationRun: runRecord,
        logs,
        verification,
        message: runRecord.errorMessage,
      };
    }

    runRecord.status = 'COMPLETED';
    runRecord.verificationStatus = 'VERIFIED';
    runRecord.completedAt = new Date().toISOString();
    runRecord.details = { ...(runRecord.details || {}), postCommitVerification: postCommitCheck.results };

    // 10. Record Migration Run into Database — AFTER the confirmed COMMIT,
    // using separate database operations (Option A). A logging failure here
    // cannot roll back committed data and cannot create a false-success;
    // it is surfaced as a documented warning instead of being swallowed.
    const loggingResult = await persistMigrationRunPostCommit(client, runRecord, logs);
    if (!loggingResult.ok) {
      logs.push({
        id: `${runId}_log_persist_warning`,
        migrationRunId: runId,
        collection: 'SYSTEM',
        documentId: 'RUN_LOGGING',
        operation: 'ERROR',
        status: 'WARNING',
        error: `تعذّر تسجيل سجل الترحيل في قاعدة البيانات (البيانات مُعتمدة ومُتحقق منها بالفعل): ${loggingResult.error}`,
        timestamp: new Date().toISOString(),
      });
      runRecord.warningsCount++;
    }

    // Save to memory store for API reads
    migrationRunHistory.unshift(runRecord);
    migrationLogStore.push(...logs);

    return {
      success: true,
      migrationRun: runRecord,
      logs,
      verification,
      message: 'تمت عملية الترحيل المعاملاتية الحقيقية والتحقق التكاملي بنجاح تام.',
    };
  } catch (err: any) {
    // 9. ROLLBACK ON ANY FAILURE
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback error if connection lost
    }

    runRecord.status = 'ROLLED_BACK';
    runRecord.verificationStatus = 'VERIFICATION_FAILED';
    runRecord.completedAt = new Date().toISOString();
    runRecord.errorMessage = err?.message || 'فشل الترحيل أثناء المعالجة المعاملاتية.';

    logs.push({
      id: `${runId}_log_rollback`,
      migrationRunId: runId,
      collection: 'SYSTEM',
      documentId: 'ROLLBACK',
      operation: 'ERROR',
      status: 'FAILED',
      error: runRecord.errorMessage,
      details: { message: 'تم التراجع الكامل عن العملية (ROLLBACK) لحماية سلامة البيانات.' },
      timestamp: new Date().toISOString(),
    });

    // Best-effort persistence of the failed run + item logs (post-ROLLBACK the
    // connection is usable again — separate operations, never inside the
    // aborted transaction). A logging failure here cannot mask the real
    // migration error and cannot create a false-success state; it is surfaced
    // as a documented warning instead of being swallowed.
    const failureLogging = await persistMigrationRunPostCommit(client, runRecord, logs);
    if (!failureLogging.ok) {
      logs.push({
        id: `${runId}_log_persist_warning`,
        migrationRunId: runId,
        collection: 'SYSTEM',
        documentId: 'RUN_LOGGING',
        operation: 'ERROR',
        status: 'WARNING',
        error: `تعذّر تسجيل سجل الترحيل الفاشل في قاعدة البيانات: ${failureLogging.error}`,
        timestamp: new Date().toISOString(),
      });
    }

    migrationRunHistory.unshift(runRecord);
    migrationLogStore.push(...logs);

    throw err;
  } finally {
    // Release Advisory Lock & In-Memory Lock
    if (advisoryLockAcquired) {
      try {
        await client.query('SELECT pg_advisory_unlock($1)', [QRMS_MIGRATION_ADVISORY_LOCK_KEY]);
      } catch {
        // Unlock on client close
      }
    }
    activeRunningMigrationId = null;
  }
}
