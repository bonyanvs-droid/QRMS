/**
 * QRMS Backup Export <-> Import Contract Compatibility Test
 *
 * Proves the exporter's canonical output is directly accepted by the
 * upload validator / migration pipeline WITHOUT manual editing:
 *
 *   assembleFirestoreFullBackup (real exporter code path)
 *     -> JSON.stringify (what the browser downloads)
 *     -> validateBackupJsonFile (what the Admin Panel runs on upload)
 *     -> transformDocument (what the migration engine runs per doc)
 *
 * Also proves legacy v1 envelope files ({id, collection, path, data:{...}})
 * are rejected explicitly at validation time.
 */

import {
  assembleFirestoreFullBackup,
  BACKUP_FORMAT_VERSION,
} from '../../src/lib/firestoreBackupService';
import { validateBackupJsonFile } from '../../src/lib/backupUploadValidator';
import { transformDocument } from '../transformers/typeTransformers';
import { COLLECTION_MAPPINGS } from '../config/collectionMap';

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
}

function runBackupExportContractTests(): void {
  let passed = 0;
  let failed = 0;

  const check = (name: string, fn: () => void) => {
    try {
      fn();
      passed++;
      console.log(`PASS: ${name}`);
    } catch (err: any) {
      failed++;
      console.error(`FAIL: ${name} -> ${err?.message}`);
    }
  };

  // -------------------------------------------------------------------------
  // Build a backup through the REAL exporter assembly path
  // -------------------------------------------------------------------------
  const mockCollections = {
    tenants: [
      { ...{ slug: 'ghazzawi', name: 'مجمع الغزاوي', isActive: true }, id: 'tenant_1789346881267' },
    ],
    quran_stage_configs: [
      { ...{ code: 'copy_0402', description: 'نسخة معيار' }, id: 'stage_copy_1789456040402' },
      { ...{ name: 'مرحلة التمهيدي', code: 'tamheedi' }, id: 'tamheedi_foundation' },
    ],
    platform_users: [
      { ...{ name: 'معلم', phone: '0500000001', role: 'teacher', tenantId: 'ghazzawi' }, id: 'usr_1' },
    ],
  };
  const mockSubcollections = {
    custodies_expenses: [
      {
        id: 'exp_1',
        parentCollection: 'custodies',
        parentId: 'cust_1',
        collection: 'expenses',
        path: 'collections/custodies/cust_1/expenses/exp_1',
        data: { amount: 100 },
      },
    ],
  };

  const backup = assembleFirestoreFullBackup({
    collections: mockCollections as any,
    subcollections: mockSubcollections as any,
    documentCounts: { tenants: 1, quran_stage_configs: 2, platform_users: 1 },
    subcollectionCounts: { 'custodies/*/expenses': 1 },
    failedCollections: [],
    errors: [],
  });

  // The browser downloads exactly this string
  const jsonString = JSON.stringify(backup);
  const reparsed = JSON.parse(jsonString);

  // -------------------------------------------------------------------------
  // TEST 1: Explicit backupVersion at ROOT level (validator contract)
  // -------------------------------------------------------------------------
  check('Exported backup has explicit root-level backupVersion', () => {
    assert(typeof reparsed.backupVersion === 'string' && reparsed.backupVersion.length > 0, 'backupVersion must be a non-empty root-level string');
    assert(reparsed.backupVersion === BACKUP_FORMAT_VERSION, `backupVersion must equal BACKUP_FORMAT_VERSION (${BACKUP_FORMAT_VERSION}), got '${reparsed.backupVersion}'`);
  });

  // -------------------------------------------------------------------------
  // TEST 2: All root-level metadata fields the importer reads are present
  // -------------------------------------------------------------------------
  check('All importer-required root metadata fields exist', () => {
    for (const field of ['exportStatus', 'auditTimestamp', 'firebaseProjectId', 'firestoreDatabaseId', 'sourceEnvironment']) {
      assert(reparsed[field] !== undefined && reparsed[field] !== null && reparsed[field] !== '', `missing root field '${field}'`);
    }
    assert(reparsed.exportStatus === 'COMPLETE', `exportStatus should be COMPLETE, got '${reparsed.exportStatus}'`);
    assert(typeof reparsed.collections === 'object' && reparsed.collections !== null, 'collections map must exist at root');
    assert(typeof reparsed.metadata === 'object' && reparsed.metadata !== null, 'metadata block must exist for exporter UI / dry-run');
    assert(reparsed.metadata.backupVersion === BACKUP_FORMAT_VERSION, 'metadata.backupVersion must match root version');
  });

  // -------------------------------------------------------------------------
  // TEST 3: Documents are FLAT (canonical contract) — no envelope wrapper
  // -------------------------------------------------------------------------
  check('Exported documents are flat: fields at doc root, id preserved', () => {
    const doc = reparsed.collections.platform_users[0];
    assert(doc.id === 'usr_1', 'doc id preserved');
    assert(doc.name === 'معلم', `doc.name must be at root level, got '${doc.name}'`);
    assert(doc.tenantId === 'ghazzawi', `doc.tenantId must be at root level, got '${doc.tenantId}'`);
    assert(doc.data === undefined, 'doc must NOT carry a .data envelope');
    assert(doc.path === undefined, 'doc must NOT carry a .path envelope field');
  });

  // -------------------------------------------------------------------------
  // TEST 4: Full pipeline — downloaded JSON passes validateBackupJsonFile
  // -------------------------------------------------------------------------
  check('Exported JSON passes backupUploadValidator cleanly', () => {
    const res = validateBackupJsonFile(jsonString);
    assert(res.isValid === true, `validator must accept exported file, errors: ${res.errors.join(' | ')}`);
    assert(res.metadata.backupVersion === BACKUP_FORMAT_VERSION, `validator must read backupVersion '${BACKUP_FORMAT_VERSION}', got '${res.metadata.backupVersion}'`);
    assert(res.metadata.exportStatus === 'COMPLETE', `validator must read exportStatus, got '${res.metadata.exportStatus}'`);
    assert(res.metadata.auditTimestamp !== undefined, 'validator must read auditTimestamp');
    assert(res.totalDocuments === 4, `expected 4 documents counted, got ${res.totalDocuments}`);
    assert(res.collectionsCount === 3, `expected 3 collections counted, got ${res.collectionsCount}`);
    assert(res.duplicateIds.length === 0 && res.missingIds.length === 0 && res.malformedDocs.length === 0, 'no structural doc issues');
  });

  // -------------------------------------------------------------------------
  // TEST 5: Flat docs feed transformDocument correctly (engine compatibility)
  // -------------------------------------------------------------------------
  check('Flat exported docs transform correctly through the migration engine path', () => {
    const qscConfig = COLLECTION_MAPPINGS['quran_stage_configs'];
    const rawDoc = reparsed.collections.quran_stage_configs[0];
    const t = transformDocument(rawDoc.id, rawDoc, qscConfig.fieldMappings, 'id');
    assert(t.data.name === 'copy_0402', `name must derive from doc code, got '${t.data.name}'`);
    assert(t.data.name !== null && t.data.name !== '', 'name must never be null');
  });

  // -------------------------------------------------------------------------
  // TEST 6: Legacy v1 envelope file is explicitly rejected
  // -------------------------------------------------------------------------
  check('Legacy envelope-format file ({id,collection,path,data}) is rejected clearly', () => {
    const legacyFile = JSON.stringify({
      metadata: { backupVersion: '1.0.0', exportStatus: 'COMPLETE' },
      collections: {
        tenants: [{ id: 't1', collection: 'tenants', path: 'collections/tenants/t1', data: { slug: 'ghazzawi', name: 'x' } }],
      },
    });
    const res = validateBackupJsonFile(legacyFile);
    assert(res.isValid === false, 'legacy envelope file must fail validation');
    const found = res.errors.some((e) => e.includes('مستندات بتنسيق غير صحيح')) || res.malformedDocs.length > 0;
    assert(found, 'expected a malformed-docs error for the envelope format');
    assert(
      res.malformedDocs.some((m) => m.reason.includes('Legacy Envelope')),
      `expected Legacy Envelope reason, got: ${res.malformedDocs.map((m) => m.reason).join(' | ')}`
    );
  });

  // -------------------------------------------------------------------------
  // TEST 7: exportStatus PARTIAL when collections fail (real computed value)
  // -------------------------------------------------------------------------
  check('exportStatus reflects real export outcome (PARTIAL on failures)', () => {
    const partial = assembleFirestoreFullBackup({
      collections: { tenants: [] } as any,
      subcollections: {} as any,
      documentCounts: { tenants: 0 },
      subcollectionCounts: {},
      failedCollections: ['students'],
      errors: ['فشل قراءة collection [students]'],
    });
    assert(partial.exportStatus === 'PARTIAL', `expected PARTIAL, got '${partial.exportStatus}'`);
    assert(partial.metadata.failedCollections?.includes('students'), 'failedCollections must be recorded in metadata');
  });

  console.log('\n===============================================================');
  console.log(`BACKUP EXPORT CONTRACT TESTS: ${passed} PASSED, ${failed} FAILED.`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runBackupExportContractTests();
