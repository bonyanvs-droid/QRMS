/**
 * QRMS Backup JSON Upload & Structural Validator
 * 
 * Deep client-side & server-side validation for Firestore backup files before ingestion.
 * 
 * Checks:
 * - Valid JSON parsing
 * - Backup metadata (version, export status, database/project, timestamp)
 * - Collections object structure
 * - Document-level ID validation (no missing IDs, no duplicate IDs within collections)
 * - Malformed document detection
 * - Dynamic document count computation
 */

export interface BackupValidationResult {
  isValid: boolean;
  backupData: any | null;
  metadata: {
    backupVersion?: string;
    exportStatus?: string;
    firebaseProject?: string;
    firestoreDatabase?: string;
    auditTimestamp?: string;
    sourceEnvironment?: string;
  };
  totalDocuments: number;
  collectionsCount: number;
  collectionStats: Record<string, number>;
  duplicateIds: { collection: string; id: string }[];
  missingIds: { collection: string; index: number }[];
  malformedDocs: { collection: string; index: number; reason: string }[];
  errors: string[];
  warnings: string[];
}

export function validateBackupJsonFile(jsonStringOrObject: string | any): BackupValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let parsedData: any = null;

  // 1. Parse JSON if string
  if (typeof jsonStringOrObject === 'string') {
    try {
      parsedData = JSON.parse(jsonStringOrObject);
    } catch (err: any) {
      return {
        isValid: false,
        backupData: null,
        metadata: {},
        totalDocuments: 0,
        collectionsCount: 0,
        collectionStats: {},
        duplicateIds: [],
        missingIds: [],
        malformedDocs: [],
        errors: [`صيغة الملف غير صالحة (JSON Parse Error): ${err?.message || 'ملف غير صالح'}`],
        warnings: [],
      };
    }
  } else if (typeof jsonStringOrObject === 'object' && jsonStringOrObject !== null) {
    parsedData = jsonStringOrObject;
  } else {
    return {
      isValid: false,
      backupData: null,
      metadata: {},
      totalDocuments: 0,
      collectionsCount: 0,
      collectionStats: {},
      duplicateIds: [],
      missingIds: [],
      malformedDocs: [],
      errors: ['بيانات النسخة الاحتياطية فارغة أو غير معرّفة.'],
      warnings: [],
    };
  }

  // 2. Validate Root Structure
  if (typeof parsedData !== 'object' || parsedData === null || Array.isArray(parsedData)) {
    return {
      isValid: false,
      backupData: null,
      metadata: {},
      totalDocuments: 0,
      collectionsCount: 0,
      collectionStats: {},
      duplicateIds: [],
      missingIds: [],
      malformedDocs: [],
      errors: ['الجذر الرئيسي لملف النسخة الاحتياطية يجب أن يكون كائناً (Object).'],
      warnings: [],
    };
  }

  // Extract Metadata
  const metadata = {
    backupVersion: parsedData.backupVersion || parsedData.version || 'unknown',
    exportStatus: parsedData.exportStatus || parsedData.status || 'unknown',
    firebaseProject: parsedData.firebaseProjectId || parsedData.firebaseProject || parsedData.projectId,
    firestoreDatabase: parsedData.firestoreDatabaseId || parsedData.firestoreDatabase || parsedData.databaseId,
    auditTimestamp: parsedData.auditTimestamp || parsedData.exportedAt || parsedData.timestamp,
    sourceEnvironment: parsedData.sourceEnvironment || 'QRMS_FIRESTORE_PRODUCTION',
  };

  if (!parsedData.backupVersion && !parsedData.version) {
    warnings.push('ملف النسخة الاحتياطية لا يحتوي على رقم إصدار صريح (backupVersion).');
  }

  // 3. Validate Collections Object
  let collectionsObj = parsedData.collections;
  if (!collectionsObj || typeof collectionsObj !== 'object' || Array.isArray(collectionsObj)) {
    // Check if the root itself is collections map
    const potentialCollections = Object.keys(parsedData).filter(
      (k) => Array.isArray(parsedData[k]) && !['warnings', 'errors'].includes(k)
    );
    if (potentialCollections.length > 0) {
      collectionsObj = {};
      for (const k of potentialCollections) {
        collectionsObj[k] = parsedData[k];
      }
      warnings.push('تم استنتاج مجموعات البيانات من الجذر مباشرة.');
    } else {
      errors.push('كائن المجموعات (collections) مفقود أو غير صالح داخل ملف النسخة الاحتياطية.');
    }
  }

  const collectionStats: Record<string, number> = {};
  const duplicateIds: { collection: string; id: string }[] = [];
  const missingIds: { collection: string; index: number }[] = [];
  const malformedDocs: { collection: string; index: number; reason: string }[] = [];

  let totalDocuments = 0;
  let collectionsCount = 0;

  if (collectionsObj && typeof collectionsObj === 'object') {
    for (const [colName, docs] of Object.entries(collectionsObj)) {
      if (!Array.isArray(docs)) {
        errors.push(`المجموعة "${colName}" ليست مصفوفة سجلات (Array).`);
        continue;
      }

      collectionsCount++;
      const count = docs.length;
      collectionStats[colName] = count;
      totalDocuments += count;

      const seenIds = new Set<string>();

      docs.forEach((doc: any, index: number) => {
        if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
          malformedDocs.push({
            collection: colName,
            index,
            reason: 'المستند ليس كائناً صحيحاً (Invalid Object).',
          });
          return;
        }

        // Legacy export envelope detection: {id, collection, path, data:{...}}
        // produced by exporter contract v1. The migration engine consumes flat
        // documents, so wrapped files must be rejected clearly at validation time.
        if (
          doc.data !== null &&
          typeof doc.data === 'object' &&
          !Array.isArray(doc.data) &&
          typeof doc.collection === 'string' &&
          typeof doc.path === 'string'
        ) {
          malformedDocs.push({
            collection: colName,
            index,
            reason: 'صيغة تصدير مغلفة قديمة (Legacy Envelope Format). أعد تصدير النسخة من لوحة التحكم للحصول على الصيغة المتوافقة مع الترحيل.',
          });
          return;
        }

        const id = doc.id || doc.documentId || doc._id;
        if (!id || typeof id !== 'string' || !id.trim()) {
          missingIds.push({
            collection: colName,
            index,
          });
        } else {
          const cleanId = String(id).trim();
          if (seenIds.has(cleanId)) {
            duplicateIds.push({
              collection: colName,
              id: cleanId,
            });
          } else {
            seenIds.add(cleanId);
          }
        }
      });
    }
  }

  if (duplicateIds.length > 0) {
    errors.push(`تم اكتشاف ${duplicateIds.length} معرفات مكررة داخل مجموعات البيانات (Duplicate Document IDs).`);
  }

  if (missingIds.length > 0) {
    errors.push(`تم اكتشاف ${missingIds.length} مستندات لا تحتوي على معرّف أساسي (Missing Document IDs).`);
  }

  if (malformedDocs.length > 0) {
    errors.push(`تم اكتشاف ${malformedDocs.length} مستندات بتنسيق غير صحيح (Malformed Documents).`);
  }

  if (totalDocuments === 0 && errors.length === 0) {
    errors.push('ملف النسخة الاحتياطية فارغ ولا يحتوي على أي مستندات (Total Documents = 0).');
  }

  const isValid = errors.length === 0;

  // Normalized backup structure
  const normalizedBackupData = {
    ...parsedData,
    collections: collectionsObj || {},
  };

  return {
    isValid,
    backupData: normalizedBackupData,
    metadata,
    totalDocuments,
    collectionsCount,
    collectionStats,
    duplicateIds,
    missingIds,
    malformedDocs,
    errors,
    warnings,
  };
}
