/**
 * QRMS Central Foreign Key Resolver Engine
 *
 * One canonical place that resolves EVERY source relationship to its FINAL
 * PostgreSQL target id BEFORE any INSERT:
 *
 *   source Firestore field
 *     -> deterministic mapping (teacher merge, tenant resolver, legacy forms)
 *     -> verified final target id
 *
 * Used by BOTH:
 *   - executeMigrationPreflight (complete FK matrix, ALL unresolved reported)
 *   - executeControlledMigration (every FK column receives the final id)
 *
 * Reuses — does not duplicate — the existing resolution systems:
 *   - TenantResolverEngine (tenantId -> tenants.id)
 *   - teacher merge mapping (raw teacher id -> usr_<rawId> users.id)
 *   - canonical seeds (INITIAL_STAGES / INITIAL_SPELLING_LESSONS / INITIAL_USERS)
 *   - preserved document ids (halaqahs, students, organizations, ...)
 */

import { COLLECTION_MAPPINGS } from '../config/collectionMap';
import { INITIAL_STAGES, INITIAL_SPELLING_LESSONS, INITIAL_USERS } from '../../src/data/initialData';
import { TenantResolverEngine } from './tenantResolverEngine';

// ---------------------------------------------------------------------------
// Spelling lesson reference resolution (legacy 'lesson_N' form support)
// ---------------------------------------------------------------------------

export interface SpellingLessonResolution {
  resolvedLessonId: string | null;
  resolutionType: 'EXACT_BACKUP' | 'EXACT_CANONICAL' | 'LEGACY_LESSON_NUMBER' | 'UNRESOLVED' | 'EMPTY';
}

export function resolveSpellingLessonReference(
  rawLessonId: any,
  collectionsObj: Record<string, any[]>
): SpellingLessonResolution {
  const tid = rawLessonId === undefined || rawLessonId === null ? '' : String(rawLessonId).trim();
  if (!tid) {
    return { resolvedLessonId: null, resolutionType: 'EMPTY' };
  }

  const backupLessons = Array.isArray(collectionsObj['spelling_lessons']) ? collectionsObj['spelling_lessons'] : [];
  const backupById = new Set<string>();
  for (const l of backupLessons) {
    const lid = String(l?.id || l?.documentId || '').trim();
    if (lid) {
      backupById.add(lid);
    }
  }

  // 1. Exact match: backup lesson id — preserved as-is
  if (backupById.has(tid)) {
    return { resolvedLessonId: tid, resolutionType: 'EXACT_BACKUP' };
  }

  // 2. Exact match: canonical seeded lesson id (spl_N) — preserved as-is
  if (INITIAL_SPELLING_LESSONS.some((s) => s.id === tid)) {
    return { resolvedLessonId: tid, resolutionType: 'EXACT_CANONICAL' };
  }

  // 3. Legacy form 'lesson_N' -> lesson with lessonNumber N
  //    (backup tenant data takes priority, then the canonical seed)
  const m = tid.match(/^lesson[_\- ]?(\d+)$/i);
  if (m) {
    const num = parseInt(m[1], 10);
    const backupByNumber = backupLessons.find(
      (l) => Number(l?.lessonNumber) === num && String(l?.id || l?.documentId || '').trim() !== ''
    );
    if (backupByNumber) {
      return {
        resolvedLessonId: String(backupByNumber.id || backupByNumber.documentId).trim(),
        resolutionType: 'LEGACY_LESSON_NUMBER',
      };
    }
    const canonical = INITIAL_SPELLING_LESSONS.find((s) => s.lessonNumber === num);
    if (canonical) {
      return { resolvedLessonId: canonical.id, resolutionType: 'LEGACY_LESSON_NUMBER' };
    }
  }

  return { resolvedLessonId: null, resolutionType: 'UNRESOLVED' };
}

// ---------------------------------------------------------------------------
// Central foreign key resolver
// ---------------------------------------------------------------------------

export interface ForeignKeyResolution {
  resolvedId: string | null;
  resolutionType: 'EXACT' | 'SEED' | 'MAPPED' | 'LEGACY_MAPPED' | 'UNRESOLVED' | 'NULL';
}

export interface ForeignKeyResolver {
  resolveForeignKey(targetTable: string, rawValue: any, sourceCollection?: string, sourceField?: string): ForeignKeyResolution;
}

function docIds(docs: any[]): Set<string> {
  const ids = new Set<string>();
  for (const d of docs) {
    const id = String(d?.id || d?.documentId || '').trim();
    if (id) {
      ids.add(id);
    }
  }
  return ids;
}

/**
 * Builds the central resolver from the backup data + existing resolution systems.
 * The mapping is computed STATICALLY (identical to what the run inserts,
 * because the teacher merge rule usr_<rawId> and all seeds are deterministic).
 */
export function buildForeignKeyResolver(
  collectionsObj: Record<string, any[]>,
  tenantResolver?: TenantResolverEngine
): ForeignKeyResolver {
  const col = (name: string): any[] => (Array.isArray(collectionsObj[name]) ? collectionsObj[name] : []);

  // --- target id sets (what will actually exist in PostgreSQL) ---
  const platformUserIds = docIds(col('platform_users'));
  const seedUserIds = new Set(INITIAL_USERS.map((u) => String(u.id)));

  // Teacher merge mapping: raw teacher id -> usr_<rawId> final users.id
  const teacherToUserId = new Map<string, string>();
  for (const t of col('teachers')) {
    const rawId = String(t?.id || t?.documentId || '').trim();
    if (!rawId) continue;
    const targetUserId = rawId.startsWith('usr_') ? rawId : `usr_${rawId}`;
    teacherToUserId.set(rawId, targetUserId);
    teacherToUserId.set(targetUserId, targetUserId);
  }

  // Stages: backup ids + canonical seed ids + aliases (code/name, legacy forms)
  const backupStageIds = docIds(col('educational_stages'));
  const canonicalStageIds = new Set(INITIAL_STAGES.map((s) => String(s.id)));
  const stageAliases = new Map<string, string>(); // normalized alias -> stage id
  const registerStageAliases = (stage: any, id: string) => {
    for (const key of [stage?.code, stage?.name]) {
      const norm = String(key || '').trim().toLowerCase();
      if (norm) {
        stageAliases.set(norm, id);
      }
    }
  };
  for (const stage of INITIAL_STAGES) {
    registerStageAliases(stage, String(stage.id));
  }
  for (const stage of col('educational_stages')) {
    const sid = String(stage?.id || stage?.documentId || '').trim();
    if (sid) {
      registerStageAliases(stage, sid);
    }
  }

  // Preserved-id targets: document ids are migrated verbatim
  const preservedTargets: Record<string, Set<string>> = {
    organizations: docIds(col('organizations')),
    halaqahs: docIds(col('halaqahs')),
    students: docIds(col('students')),
    track_definitions: docIds(col('track_definitions')),
    seasonal_programs: docIds(col('seasonal_programs')),
    seasonal_activities: docIds(col('seasonal_activities')),
    student_point_rules: docIds(col('student_point_rules')),
  };

  function resolve(
    targetTable: string,
    rawValue: any,
    _sourceCollection?: string,
    _sourceField?: string
  ): ForeignKeyResolution {
    if (rawValue === undefined || rawValue === null) {
      return { resolvedId: null, resolutionType: 'NULL' }; // FK columns allow NULL
    }
    const tid = String(rawValue).trim();
    if (!tid) {
      return { resolvedId: null, resolutionType: 'NULL' };
    }

    switch (targetTable) {
      case 'users': {
        if (platformUserIds.has(tid)) {
          return { resolvedId: tid, resolutionType: 'EXACT' };
        }
        if (seedUserIds.has(tid)) {
          return { resolvedId: tid, resolutionType: 'SEED' };
        }
        const mapped = teacherToUserId.get(tid);
        if (mapped) {
          return { resolvedId: mapped, resolutionType: mapped === tid ? 'EXACT' : 'MAPPED' };
        }
        return { resolvedId: null, resolutionType: 'UNRESOLVED' };
      }

      case 'tenants': {
        if (tenantResolver) {
          const res = tenantResolver.resolveTenantId(rawValue);
          if (res.isResolved && res.resolvedTenantId) {
            return { resolvedId: res.resolvedTenantId, resolutionType: 'EXACT' };
          }
        }
        return { resolvedId: null, resolutionType: 'UNRESOLVED' };
      }

      case 'stages': {
        if (backupStageIds.has(tid)) {
          return { resolvedId: tid, resolutionType: 'EXACT' };
        }
        if (canonicalStageIds.has(tid)) {
          return { resolvedId: tid, resolutionType: 'SEED' };
        }
        const alias = stageAliases.get(tid.toLowerCase());
        if (alias) {
          return { resolvedId: alias, resolutionType: 'MAPPED' }; // legacy stage code/name
        }
        return { resolvedId: null, resolutionType: 'UNRESOLVED' };
      }

      case 'spelling_lessons': {
        const res = resolveSpellingLessonReference(rawValue, collectionsObj);
        if (res.resolutionType === 'EMPTY') {
          return { resolvedId: null, resolutionType: 'NULL' };
        }
        if (res.resolutionType === 'UNRESOLVED') {
          return { resolvedId: null, resolutionType: 'UNRESOLVED' };
        }
        if (res.resolutionType === 'LEGACY_LESSON_NUMBER') {
          return { resolvedId: res.resolvedLessonId, resolutionType: 'LEGACY_MAPPED' };
        }
        return { resolvedId: res.resolvedLessonId, resolutionType: res.resolutionType === 'EXACT_CANONICAL' ? 'SEED' : 'EXACT' };
      }

      default: {
        const set = preservedTargets[targetTable];
        if (set && set.has(tid)) {
          return { resolvedId: tid, resolutionType: 'EXACT' };
        }
        return { resolvedId: null, resolutionType: 'UNRESOLVED' };
      }
    }
  }

  return { resolveForeignKey: resolve };
}

// ---------------------------------------------------------------------------
// Comprehensive preflight FK validation — reports ALL unresolved relationships
// ---------------------------------------------------------------------------

export interface UnresolvedForeignKeyItem {
  collection: string;
  documentId: string;
  sourceField: string;
  targetColumn: string;
  rawValue: string;
  targetTable: string;
}

export interface ForeignKeyCheckReport {
  totalReferences: number;
  directlyValidCount: number;
  seedResolvedCount: number;
  mappedCount: number;
  unresolvedCount: number;
  unresolved: UnresolvedForeignKeyItem[];
  errors: string[];
  warnings: string[];
}

/**
 * Validates EVERY isForeignKey mapping rule of EVERY mapped collection in the
 * backup (except tenant_id rules, which are covered by the dedicated
 * TenantResolverEngine preflight check). Reports ALL unresolved references in
 * one matrix — it never stops at the first failure.
 */
export function validateAllForeignKeys(
  collectionsObj: Record<string, any[]>,
  tenantResolver?: TenantResolverEngine
): ForeignKeyCheckReport {
  const resolver = buildForeignKeyResolver(collectionsObj, tenantResolver);
  const unresolved: UnresolvedForeignKeyItem[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  let totalReferences = 0;
  let directlyValidCount = 0;
  let seedResolvedCount = 0;
  let mappedCount = 0;

  for (const [colName, docs] of Object.entries(collectionsObj || {})) {
    const config = COLLECTION_MAPPINGS[colName];
    if (!config || !Array.isArray(docs)) {
      continue;
    }

    const fkRules = config.fieldMappings.filter(
      (r) => r.isForeignKey && r.foreignKeyTable && r.foreignKeyTable !== 'tenants'
    );
    if (fkRules.length === 0) {
      continue;
    }

    for (const doc of docs) {
      const docId = String(doc?.id || doc?.documentId || 'UNKNOWN');
      for (const rule of fkRules) {
        const rawValue = rule.firestoreField === 'id' ? docId : doc?.[rule.firestoreField];
        if (rawValue === undefined || rawValue === null) {
          continue; // no reference — column stays NULL (FK allows NULL)
        }
        if (String(rawValue).trim() === '') {
          // Empty-string reference: NOT valid in PostgreSQL ('' ≠ NULL and is
          // never a target id). The engine normalizes it to NULL at insert.
          warnings.push(
            `مرجع فارغ (Empty FK Reference): المستند '${docId}' في '${colName}' الحقل '${rule.firestoreField}' يحتوي نصاً فارغاً - سيتم إدراج العمود '${rule.postgresColumn}' كـ NULL (لا يوجد مرجع فعلي).`
          );
          continue;
        }
        totalReferences++;
        const res = resolver.resolveForeignKey(rule.foreignKeyTable, rawValue, colName, rule.firestoreField);
        if (res.resolutionType === 'UNRESOLVED') {
          unresolved.push({
            collection: colName,
            documentId: docId,
            sourceField: rule.firestoreField,
            targetColumn: rule.postgresColumn,
            rawValue: String(rawValue).trim(),
            targetTable: rule.foreignKeyTable || '',
          });
          errors.push(
            `علاقة أجنبية غير محلولة (Unresolved FK): المستند '${docId}' في '${colName}' الحقل '${rule.firestoreField}' = '${String(rawValue).trim()}' لا يشير إلى ${rule.foreignKeyTable}.id صالح ولا يمكن تحويله إلى معرف نهائي.`
          );
        } else if (res.resolutionType === 'MAPPED' || res.resolutionType === 'LEGACY_MAPPED') {
          mappedCount++;
          warnings.push(
            `تحويل مرجع: المستند '${docId}' في '${colName}' الحقل '${rule.firestoreField}' = '${String(rawValue).trim()}' → ${rule.foreignKeyTable}.id = '${res.resolvedId}'.`
          );
        } else if (res.resolutionType === 'SEED') {
          seedResolvedCount++;
        } else {
          directlyValidCount++;
        }
      }
    }
  }

  return {
    totalReferences,
    directlyValidCount,
    seedResolvedCount,
    mappedCount,
    unresolvedCount: unresolved.length,
    unresolved,
    errors,
    warnings,
  };
}
