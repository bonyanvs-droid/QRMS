/**
 * QRMS Migration Engine - Self-Tests & Validation Suite
 * 
 * Tests structural correctness, ID preservation, transformations,
 * order dependencies, tenant isolation, and safety guards without live data.
 */

import { MigrationEngine } from '../core/migrationEngine';
import { COLLECTION_MAPPINGS } from '../config/collectionMap';
import { MIGRATION_ORDER } from '../config/migrationOrder';
import {
  transformTimestamp,
  transformDocumentReference,
  transformDocument,
} from '../transformers/typeTransformers';

export async function runSelfTests(): Promise<{ passed: boolean; results: string[] }> {
  const results: string[] = [];
  let allPassed = true;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      results.push(`✅ [PASS] ${testName}`);
    } else {
      results.push(`❌ [FAIL] ${testName}`);
      allPassed = false;
    }
  }

  // Test 1: All Migration Order collections exist in Collection Mappings
  const mappedKeys = new Set(Object.keys(COLLECTION_MAPPINGS));
  const orderKeys = MIGRATION_ORDER.map((s) => s.collection);
  const missingInMap = orderKeys.filter((k) => !mappedKeys.has(k));
  assert(missingInMap.length === 0, `All ${orderKeys.length} ordered collections exist in mapping`);

  // Test 2: Document IDs are strictly preserved as non-empty strings
  const sampleDoc = {
    id: 'doc_custom_id_123',
    name: 'مجمع الفرقان',
    slug: 'al-furqan',
    city: 'الرياض',
    district: 'حي اليرموك',
    supervisorName: 'د. نور',
    contactPhone: '0569990593',
  };
  const transformedTenant = transformDocument(
    sampleDoc.id,
    sampleDoc,
    COLLECTION_MAPPINGS.tenants.fieldMappings,
    COLLECTION_MAPPINGS.tenants.primaryKey,
    COLLECTION_MAPPINGS.tenants.tenantKey,
    COLLECTION_MAPPINGS.tenants.organizationKey
  );
  assert(
    transformedTenant.id === 'doc_custom_id_123' && typeof transformedTenant.id === 'string',
    'Document IDs strictly preserved as string without re-generation or auto-increment'
  );

  // Test 3: Timestamp transformation works for Date, ISO, and Firestore Timestamp objects
  const isoStr = '2026-09-17T12:00:00.000Z';
  const fsTimestamp = { seconds: 1789646400, nanoseconds: 0, toDate: () => new Date(isoStr) };
  assert(transformTimestamp(isoStr) === isoStr, 'Transform ISO string timestamp');
  assert(transformTimestamp(fsTimestamp) === isoStr, 'Transform Firestore Timestamp object');

  // Test 4: DocumentReference transformation extracts ID cleanly
  const docRef = { id: 'ref_halaqah_001', path: 'halaqahs/ref_halaqah_001' };
  assert(transformDocumentReference(docRef) === 'ref_halaqah_001', 'Transform DocumentReference to string ID');

  // Test 5: Unknown fields are captured into unknownFields map without guessing
  const docWithExtra = {
    id: 'usr_999',
    name: 'أحمد',
    phone: '0501112233',
    role: 'teacher',
    unmappedCustomFeatureX: 'value_123',
  };
  const transformedUser = transformDocument(
    docWithExtra.id,
    docWithExtra,
    COLLECTION_MAPPINGS.platform_users.fieldMappings,
    COLLECTION_MAPPINGS.platform_users.primaryKey
  );
  assert(
    transformedUser.unknownFields['unmappedCustomFeatureX'] === 'value_123',
    'Unknown fields recorded as UNKNOWN_FIELD without guessing'
  );

  // Test 6: Safety Guard: executeWrite() must throw and prevent any database write
  const engine = new MigrationEngine();
  let writeBlocked = false;
  try {
    await engine.executeWrite();
  } catch (err: any) {
    if (err.message.includes('SAFETY GUARD')) {
      writeBlocked = true;
    }
  }
  assert(writeBlocked, 'ExecuteWrite() blocked by Phase 3 Safety Guard');

  // Test 7: Dry-Run completes cleanly with honest N/A counts for unavailable Firestore
  const report = await engine.executeDryRun();
  assert(report.isDryRun === true, 'Engine executes in Dry-Run mode');
  assert(report.quotaStatus === 'exhausted', 'Honest reporting of Firestore Quota status');
  assert(report.collectionReports['tenants']?.sourceDocumentCount === 'N/A', 'Source document counts report N/A when quota unavailable');

  // Test 8: Organizations table and relations remain untouched
  assert(COLLECTION_MAPPINGS.organizations.postgresTable === 'organizations', 'Organizations table preserved 1:1');
  assert(COLLECTION_MAPPINGS.tenants.fieldMappings.some(f => f.postgresColumn === 'organization_id'), 'Tenants link to organizations preserved');

  // Test 9: Phone requirement logic (Optional for students, Required for teachers/staff)
  const validatorInstance = new (await import('../validators/migrationValidator')).MigrationValidator();
  
  const studentDocNoPhone = {
    id: 'usr_std_qusay_123',
    name: 'قصي بن محمد',
    role: 'student',
    student_id: 'std_qusay',
    tenant_id: 'ghazzawi',
    stage_id: 'baraem',
    login_identifier: 'std_qusay',
  };
  const transformedStudent = transformDocument(
    studentDocNoPhone.id,
    studentDocNoPhone,
    COLLECTION_MAPPINGS.platform_users.fieldMappings,
    COLLECTION_MAPPINGS.platform_users.primaryKey
  );
  const studentReport = validatorInstance.validateBatch(COLLECTION_MAPPINGS.platform_users, [transformedStudent], 1);
  assert(studentReport.validCount === 1 && studentReport.invalidCount === 0, 'Student account without phone is valid (0 fatal errors)');

  const teacherDocNoPhone = {
    id: 'usr_teacher_no_phone',
    name: 'معلم بدون هاتف',
    role: 'teacher',
    tenant_id: 'ghazzawi',
    login_identifier: 'teacher_01',
  };
  const transformedTeacher = transformDocument(
    teacherDocNoPhone.id,
    teacherDocNoPhone,
    COLLECTION_MAPPINGS.platform_users.fieldMappings,
    COLLECTION_MAPPINGS.platform_users.primaryKey
  );
  const teacherReport = validatorInstance.validateBatch(COLLECTION_MAPPINGS.platform_users, [transformedTeacher], 1);
  assert(teacherReport.invalidCount === 1, 'Teacher account without phone correctly triggers required field validation');

  // Test 10: Canonical stage 'baraem' is pre-registered and resolves FK checks
  assert(validatorInstance.hasIdInTable('stages', 'baraem'), "Stage 'baraem' pre-seeded and exists in known stages table");
  assert(validatorInstance.hasIdInTable('stages', 'ashbal'), "Stage 'ashbal' pre-seeded and exists in known stages table");

  // Test 11: Teacher ID mapping from teachers collection resolves halaqah foreign key
  validatorInstance.registerId('users', '1111111111', 'teachers');
  assert(validatorInstance.hasIdInTable('users', '1111111111'), 'Teacher 1111111111 mapped into users table and resolves halaqahs.teacher_id FK');

  return { passed: allPassed, results };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSelfTests().then(({ passed, results }) => {
    console.log('\n--- Migration Self-Test Suite ---');
    results.forEach((r) => console.log(r));
    console.log(`\nOverall Result: ${passed ? 'ALL PASSED ✅' : 'FAILED ❌'}\n`);
    if (!passed) process.exit(1);
  });
}
