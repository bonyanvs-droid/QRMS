/**
 * QRMS Firestore Full Backup Exporter Service
 * 
 * Strict Read-Only snapshot extraction from Firestore database:
 * - 35 Collections from Migration Mapping
 * - 5 Additional Archival/Master Collections: archived_halaqahs, archived_teachers, archived_supervisors, archived_users, teachers
 * - Deep Subcollections: custodies/{custodyId}/expenses
 * 
 * Preserves Document IDs, structural collection paths, nested objects, arrays,
 * and field data types (Timestamps, booleans, numbers, strings, null).
 */

import {
  collection,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import firebaseConfig from '../../firebase-applet-config.json';

export const BACKUP_COLLECTIONS: string[] = [
  // Tier 1: Master Collections from Migration Mapping
  'organizations',
  'educational_stages',
  'quran_stage_configs',
  'academic_years',
  'spelling_lessons',
  'tenants',
  'platform_users',
  'track_definitions',
  'halaqahs',
  'students',
  'quran_plans',
  'daily_records',
  'educational_plan',
  'seasonal_programs',
  'seasonal_activities',
  'seasonal_participations',
  'financial_records',
  'revenues',
  'expenses',
  'custodies',
  'budget_requests',
  'finance_settings',
  'registration_requests',
  'track_nominations',
  'association_nominations',
  'badges',
  'remedial_plans',
  'meetings',
  'staff_attendance',
  'prayer_times',
  'frontendConfigs',
  'audit_logs',
  'report_logs',
  'academic_archives',
  'support_sessions',
  // Tier 2: Additional Archival & Master Collections
  'archived_halaqahs',
  'archived_teachers',
  'archived_supervisors',
  'archived_users',
  'teachers',
];

/**
 * Canonical backup contract version produced by this exporter.
 * Must match the structure expected by backupUploadValidator + migration engine.
 */
export const BACKUP_FORMAT_VERSION = '2.0.0';

/**
 * Flat document shape — the canonical import contract.
 * Firestore document ID is preserved as the `id` field; all original
 * Firestore fields live at the document root (no envelope/wrapper).
 */
export interface SerializedFirestoreDoc {
  id: string;
  [key: string]: any;
}

export interface SerializedSubcollectionDoc {
  id: string;
  parentCollection: string;
  parentId: string;
  collection: string;
  path: string;
  data: Record<string, any>;
}

export interface BackupMetadata {
  backupVersion: string;
  backupType: string;
  createdAt: string;
  firebaseProjectId: string;
  firestoreDatabaseId: string;
  application: string;
  collections: string[];
  documentCounts: Record<string, number>;
  subcollectionCounts: Record<string, number>;
  totalCollections: number;
  totalDocuments: number;
  totalSubcollectionDocuments: number;
  exportStatus: 'COMPLETE' | 'PARTIAL';
  failedCollections?: string[];
  errors?: string[];
}

export interface FirestoreFullBackup {
  // Canonical root-level import contract — consumed by
  // backupUploadValidator, reconciliation, preflight and the migration engine.
  backupVersion: string;
  backupType: string;
  exportStatus: 'COMPLETE' | 'PARTIAL';
  auditTimestamp: string;
  firebaseProjectId: string;
  firestoreDatabaseId: string;
  sourceEnvironment: string;
  application: string;
  totalCollections: number;
  totalDocuments: number;
  totalSubcollectionDocuments: number;
  documentCounts: Record<string, number>;
  // Nested metadata block kept for the exporter UI + restore dry-run engine.
  metadata: BackupMetadata;
  collections: Record<string, SerializedFirestoreDoc[]>;
  subcollections: Record<string, SerializedSubcollectionDoc[]>;
}

export interface BackupProgress {
  currentCollection: string;
  currentCollectionIndex: number;
  totalCollections: number;
  readDocsInCurrent: number;
  totalDocsSoFar: number;
  subcollectionStatus: string;
  phase: 'idle' | 'reading_collections' | 'reading_subcollections' | 'building_archive' | 'completed' | 'failed';
  errors: string[];
}

/**
 * Deep serializer preserving Firestore types (Timestamps, Geopoints, etc.)
 */
export function serializeFirestoreValue(val: any): any {
  if (val === null || val === undefined) {
    return null;
  }

  // Handle Firestore Timestamp or object with seconds & nanoseconds
  if (val instanceof Timestamp || (typeof val === 'object' && typeof val.seconds === 'number' && typeof val.nanoseconds === 'number')) {
    const isoString = typeof val.toDate === 'function' 
      ? val.toDate().toISOString() 
      : new Date(val.seconds * 1000 + Math.round(val.nanoseconds / 1000000)).toISOString();
    return {
      _type: 'timestamp',
      seconds: val.seconds,
      nanoseconds: val.nanoseconds,
      iso: isoString,
    };
  }

  // Handle standard Javascript Date
  if (val instanceof Date) {
    return {
      _type: 'timestamp',
      seconds: Math.floor(val.getTime() / 1000),
      nanoseconds: (val.getTime() % 1000) * 1000000,
      iso: val.toISOString(),
    };
  }

  // Handle Arrays recursively
  if (Array.isArray(val)) {
    return val.map((item) => serializeFirestoreValue(item));
  }

  // Handle nested Objects recursively
  if (typeof val === 'object') {
    const result: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      result[key] = serializeFirestoreValue(val[key]);
    }
    return result;
  }

  // Primitives: string, number, boolean
  return val;
}

/**
 * Executes a full Read-Only backup of all collections and subcollections
 */
export async function executeFirestoreBackup(
  onProgress?: (progress: BackupProgress) => void
): Promise<FirestoreFullBackup> {
  const resultCollections: Record<string, SerializedFirestoreDoc[]> = {};
  const resultSubcollections: Record<string, SerializedSubcollectionDoc[]> = {};
  const documentCounts: Record<string, number> = {};
  const subcollectionCounts: Record<string, number> = {};
  const failedCollections: string[] = [];
  const errors: string[] = [];

  let totalDocsCount = 0;
  let totalSubdocsCount = 0;
  const totalCollections = BACKUP_COLLECTIONS.length;

  const reportProgress = (
    colName: string,
    colIdx: number,
    colDocs: number,
    subStatus: string,
    phase: BackupProgress['phase']
  ) => {
    if (onProgress) {
      onProgress({
        currentCollection: colName,
        currentCollectionIndex: colIdx,
        totalCollections,
        readDocsInCurrent: colDocs,
        totalDocsSoFar: totalDocsCount + totalSubdocsCount,
        subcollectionStatus: subStatus,
        phase,
        errors: [...errors],
      });
    }
  };

  // 1. Read all top-level collections
  for (let i = 0; i < BACKUP_COLLECTIONS.length; i++) {
    const colName = BACKUP_COLLECTIONS[i];
    reportProgress(colName, i + 1, 0, 'في الانتظار', 'reading_collections');

    try {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      const docsList: SerializedFirestoreDoc[] = [];

      snapshot.forEach((docSnap) => {
        const rawData = docSnap.data();
        const serializedData = serializeFirestoreValue(rawData);

        // Canonical flat document: original Firestore fields at root level,
        // document ID preserved and always wins over any data field named "id".
        docsList.push({
          ...serializedData,
          id: docSnap.id,
        });
      });

      resultCollections[colName] = docsList;
      documentCounts[colName] = docsList.length;
      totalDocsCount += docsList.length;

      reportProgress(colName, i + 1, docsList.length, 'جاهز', 'reading_collections');
    } catch (err: any) {
      const errMsg = `فشل قراءة collection [${colName}]: ${err?.message || String(err)}`;
      errors.push(errMsg);
      failedCollections.push(colName);
      resultCollections[colName] = [];
      documentCounts[colName] = 0;
    }
  }

  // 2. Read subcollections: custodies/{custodyId}/expenses
  reportProgress('custodies/expenses', totalCollections, 0, 'جاري فحص العهد والعهد الفرعية', 'reading_subcollections');
  const custodyExpensesDocs: SerializedSubcollectionDoc[] = [];
  const custodyDocs = resultCollections['custodies'] || [];

  for (const custody of custodyDocs) {
    try {
      const expensesRef = collection(db, 'custodies', custody.id, 'expenses');
      const expensesSnap = await getDocs(expensesRef);

      expensesSnap.forEach((expDoc) => {
        const rawData = expDoc.data();
        const serializedData = serializeFirestoreValue(rawData);

        custodyExpensesDocs.push({
          id: expDoc.id,
          parentCollection: 'custodies',
          parentId: custody.id,
          collection: 'expenses',
          path: `collections/custodies/${custody.id}/expenses/${expDoc.id}`,
          data: serializedData,
        });
      });
    } catch (err: any) {
      const errMsg = `فشل قراءة subcollection مصاريف العهدة [custodies/${custody.id}/expenses]: ${err?.message || String(err)}`;
      errors.push(errMsg);
    }
  }

  resultSubcollections['custodies_expenses'] = custodyExpensesDocs;
  subcollectionCounts['custodies/*/expenses'] = custodyExpensesDocs.length;
  totalSubdocsCount += custodyExpensesDocs.length;

  // 3. Assemble full backup object (canonical import contract)
  reportProgress('الانتهاء والتجميع', totalCollections, 0, 'اكتمل', 'building_archive');

  const fullBackup = assembleFirestoreFullBackup({
    collections: resultCollections,
    subcollections: resultSubcollections,
    documentCounts,
    subcollectionCounts,
    failedCollections,
    errors,
  });

  reportProgress(
    'اكتملت النسخة الاحتياطية',
    totalCollections,
    totalDocsCount,
    fullBackup.exportStatus === 'COMPLETE' ? 'اكتملت كافة المجموعات والمسارات بنجاح' : 'تحذير: نسخة جزئية',
    fullBackup.exportStatus === 'COMPLETE' ? 'completed' : 'failed'
  );

  return fullBackup;
}

/**
 * Pure assembly of the canonical backup file object.
 * Produces the exact root-level contract consumed by backupUploadValidator,
 * reconciliation, preflight and the migration engine — flat documents,
 * explicit backupVersion, real project metadata, computed counts.
 * Extracted as a pure function so the contract is unit-testable without Firestore.
 */
export function assembleFirestoreFullBackup(params: {
  collections: Record<string, SerializedFirestoreDoc[]>;
  subcollections: Record<string, SerializedSubcollectionDoc[]>;
  documentCounts: Record<string, number>;
  subcollectionCounts: Record<string, number>;
  failedCollections: string[];
  errors: string[];
}): FirestoreFullBackup {
  const totalDocsCount = Object.values(params.documentCounts).reduce((acc, n) => acc + n, 0);
  const totalSubdocsCount = Object.values(params.subcollectionCounts).reduce((acc, n) => acc + n, 0);
  const exportStatus: 'COMPLETE' | 'PARTIAL' =
    params.failedCollections.length === 0 && params.errors.length === 0 ? 'COMPLETE' : 'PARTIAL';
  const createdAt = new Date().toISOString();
  const firebaseProjectId = firebaseConfig.projectId || 'trans-tree-p53bd';
  const firestoreDatabaseId =
    firebaseConfig.firestoreDatabaseId || 'ai-studio-remixqrms-62c30d59-335a-4f40-8bfd-b498418c7ebd';
  const application = 'نظام إدارة المجمعات القرآنية (Quranic Centers Management System)';

  return {
    // Canonical root-level import contract
    backupVersion: BACKUP_FORMAT_VERSION,
    backupType: 'FIRESTORE_FULL_SNAPSHOT',
    exportStatus,
    auditTimestamp: createdAt,
    firebaseProjectId,
    firestoreDatabaseId,
    sourceEnvironment: 'QRMS_FIRESTORE_PRODUCTION',
    application,
    totalCollections: BACKUP_COLLECTIONS.length,
    totalDocuments: totalDocsCount,
    totalSubcollectionDocuments: totalSubdocsCount,
    documentCounts: params.documentCounts,
    // Nested metadata block kept for the exporter UI + restore dry-run engine.
    metadata: {
      backupVersion: BACKUP_FORMAT_VERSION,
      backupType: 'FIRESTORE_FULL_SNAPSHOT',
      createdAt,
      firebaseProjectId,
      firestoreDatabaseId,
      application,
      collections: BACKUP_COLLECTIONS,
      documentCounts: params.documentCounts,
      subcollectionCounts: params.subcollectionCounts,
      totalCollections: BACKUP_COLLECTIONS.length,
      totalDocuments: totalDocsCount,
      totalSubcollectionDocuments: totalSubdocsCount,
      exportStatus,
      failedCollections: params.failedCollections.length > 0 ? params.failedCollections : undefined,
      errors: params.errors.length > 0 ? params.errors : undefined,
    },
    collections: params.collections,
    subcollections: params.subcollections,
  };
}

/**
 * Generates standard timestamped filename:
 * QRMS-Firestore-Backup-YYYY-MM-DD-HHmmss.json
 */
export function generateBackupFileName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  return `QRMS-Firestore-Backup-${year}-${month}-${day}-${hours}${minutes}${seconds}.json`;
}

/**
 * Triggers client-side browser file download from in-memory backup object
 */
export function downloadBackupFile(backupData: FirestoreFullBackup, customFileName?: string): string {
  const fileName = customFileName || generateBackupFileName();
  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up URL object after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}
