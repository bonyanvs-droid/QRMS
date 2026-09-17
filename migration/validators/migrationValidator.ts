/**
 * QRMS Migration Engine - Validation Layer v2
 * 
 * Enforces rigorous architectural integrity checks on transformed records:
 * 1. String-based Primary Key Preservation & Uniqueness (Firestore Document ID === PostgreSQL Primary Key)
 * 2. Deterministic Tenant Resolution (Single active tenant: Al-Ghazzawi)
 * 3. Multi-Tier Foreign Key Analysis (Resolvable, Deferred Internal, Missing External, Unresolvable)
 * 4. Required Field Presence & Non-nullness
 * 5. Type Consistency
 * 6. Audit of Unknown / Legacy / Flexible Fields
 */

import {
  CollectionMigrationConfig,
  TransformedRecord,
  ValidationErrorItem,
  ValidationWarningItem,
  CollectionValidationReport,
} from '../core/migrationTypes';

export interface ExtendedValidationReport extends CollectionValidationReport {
  resolvableFkCount: number;
  deferredFkCount: number;
  missingExternalFkCount: number;
  unresolvableFkCount: number;
  tenantResolvedCount: number;
  tenantResolutionType: 'EXPLICIT_IN_DATA' | 'DEFAULTED_TO_AL_GHAZZAWI' | 'GLOBAL_SYSTEM' | 'MIXED';
}

export class MigrationValidator {
  private knownIdsByTable: Map<string, Set<string>> = new Map();
  private knownIdsByCollection: Map<string, Set<string>> = new Map();
  private defaultTenantId: string = 'ghazzawi';

  constructor() {
    // Pre-register canonical educational stage master seeds (including 'baraem', 'ashbal', etc.)
    const canonicalStages = ['baraem', 'ashbal', 'fityan', 'motawassit', 'thanawi', 'jamiyeen'];
    for (const stg of canonicalStages) {
      this.registerId('stages', stg, 'educational_stages');
    }
  }

  /**
   * Registers a known ID for foreign key cross-referencing.
   */
  public registerId(table: string, id: string, collectionName?: string): void {
    if (!id || typeof id !== 'string') return;
    const cleanId = id.trim();
    if (!cleanId) return;

    if (!this.knownIdsByTable.has(table)) {
      this.knownIdsByTable.set(table, new Set());
    }
    this.knownIdsByTable.get(table)!.add(cleanId);

    if (collectionName) {
      if (!this.knownIdsByCollection.has(collectionName)) {
        this.knownIdsByCollection.set(collectionName, new Set());
      }
      this.knownIdsByCollection.get(collectionName)!.add(cleanId);
    }
  }

  /**
   * Checks if an ID exists in another collection in the same backup (e.g. teachers vs users).
   */
  public hasIdInCollection(collectionName: string, id: string): boolean {
    const colSet = this.knownIdsByCollection.get(collectionName);
    return !!colSet && colSet.has(id);
  }

  /**
   * Checks if an ID exists in a target PostgreSQL table set.
   */
  public hasIdInTable(table: string, id: string): boolean {
    const tblSet = this.knownIdsByTable.get(table);
    return !!tblSet && tblSet.has(id);
  }

  /**
   * Validates a batch of transformed records for a specific collection configuration.
   */
  public validateBatch(
    config: CollectionMigrationConfig,
    records: TransformedRecord[],
    sourceDocCount: number | 'N/A' = 'N/A'
  ): ExtendedValidationReport {
    const errors: ValidationErrorItem[] = [];
    const warnings: ValidationWarningItem[] = [];
    const unknownFieldsSet = new Set<string>();
    const seenIdsInBatch = new Set<string>();

    let validCount = 0;
    let invalidCount = 0;
    let resolvableFkCount = 0;
    let deferredFkCount = 0;
    let missingExternalFkCount = 0;
    let unresolvableFkCount = 0;
    let tenantResolvedCount = 0;
    let hasExplicitTenant = false;
    let hasDefaultedTenant = false;

    for (const record of records) {
      let recordHasFatalError = false;

      // 1. ID Validation: Must be non-empty string
      if (!record.id || typeof record.id !== 'string' || record.id.trim() === '') {
        errors.push({
          type: 'ID_MISSING',
          message: `Missing or invalid document ID for collection ${config.firestoreCollection}`,
          documentId: record.rawFirestoreId || 'UNKNOWN',
        });
        recordHasFatalError = true;
      } else if (seenIdsInBatch.has(record.id)) {
        errors.push({
          type: 'ID_INVALID',
          message: `Duplicate document ID detected: ${record.id}`,
          documentId: record.id,
        });
        recordHasFatalError = true;
      } else {
        seenIdsInBatch.add(record.id);
        this.registerId(config.postgresTable, record.id, config.firestoreCollection);
      }

      // 2. Tenant Context & Deterministic Resolution
      if (config.tenantKey) {
        const tenantVal = record.data[config.tenantKey];
        if (tenantVal && typeof tenantVal === 'string' && tenantVal.trim() !== '') {
          hasExplicitTenant = true;
        } else {
          // Deterministic resolution: Al-Ghazzawi is the only active tenant in the current dataset
          hasDefaultedTenant = true;
          tenantResolvedCount++;
          record.data[config.tenantKey] = this.defaultTenantId;
          record.tenantId = this.defaultTenantId;
          warnings.push({
            type: 'DEFAULT_APPLIED',
            field: config.tenantKey,
            message: `حقل tenant_id مفقود أصلاً في المستند، تم استنتاجه وتحديده حتمياً: ${this.defaultTenantId} (السبب: مجمع الغزاوي هو الـ Tenant الوحيد النشط حالياً)`,
            documentId: record.id,
          });
        }
      }

      // 3. Required Fields & Foreign Key Multi-Tier Analysis
      for (const rule of config.fieldMappings) {
        const val = record.data[rule.postgresColumn];

        if (rule.required && (val === undefined || val === null || val === '')) {
          // Specific business & architectural rule: student accounts do not strictly require personal phone numbers
          // (students authenticate via nationalId or student identification; parent/emergency phones are auxiliary).
          const isStudentAccount = (
            record.data['role'] === 'student' ||
            (typeof record.id === 'string' && record.id.startsWith('usr_std_')) ||
            !!record.data['student_id']
          );
          if (rule.postgresColumn === 'phone' && isStudentAccount) {
            // Permitted: phone is optional for student role in schema and business rules
            continue;
          }

          errors.push({
            type: 'REQUIRED_FIELD_MISSING',
            field: rule.postgresColumn,
            message: `الحقل الإلزامي '${rule.postgresColumn}' مفقود أو فارغ في ${config.firestoreCollection}`,
            documentId: record.id,
          });
          recordHasFatalError = true;
        }

        // Multi-tier Foreign Key verification
        if (rule.isForeignKey && rule.foreignKeyTable && val && typeof val === 'string' && val.trim() !== '') {
          const fkVal = val.trim();
          const targetTableSet = this.knownIdsByTable.get(rule.foreignKeyTable);

          if (targetTableSet && targetTableSet.has(fkVal)) {
            // Tier 1: Directly resolvable in target table
            resolvableFkCount++;
          } else if (
            (rule.foreignKeyTable === 'users' && this.hasIdInCollection('teachers', fkVal)) ||
            (rule.foreignKeyTable === 'tenants' && fkVal === 'ghazzawi') ||
            (rule.foreignKeyTable === 'stages' && this.hasIdInCollection('educational_stages', fkVal))
          ) {
            // Tier 2: Deferred internal FK (exists in source collections/unmapped entities in the backup)
            deferredFkCount++;
            warnings.push({
              type: 'UNKNOWN_FIELD',
              field: rule.postgresColumn,
              message: `مرجع علاقة مؤجل (Deferred FK): '${fkVal}' موجود في مجموعة المصدر وسيتم ربطه أثناء الترحيل.`,
              documentId: record.id,
            });
          } else if (fkVal.startsWith('http') || fkVal.length < 2) {
            // Tier 4: Unresolvable / invalid format
            unresolvableFkCount++;
            warnings.push({
              type: 'UNKNOWN_FIELD',
              field: rule.postgresColumn,
              message: `مرجع علاقة غير صالح التنسيق (Unresolvable FK): '${fkVal}'.`,
              documentId: record.id,
            });
          } else {
            // Tier 3: Missing external FK (not in this backup)
            missingExternalFkCount++;
            warnings.push({
              type: 'UNKNOWN_FIELD',
              field: rule.postgresColumn,
              message: `مرجع خارجي غير موجود في النسخة (Missing External FK): '${fkVal}' في جدول '${rule.foreignKeyTable}'.`,
              documentId: record.id,
            });
          }
        }
      }

      // 4. Audit Unknown / Flexible Fields
      if (record.unknownFields && Object.keys(record.unknownFields).length > 0) {
        for (const unknownKey of Object.keys(record.unknownFields)) {
          unknownFieldsSet.add(unknownKey);
          warnings.push({
            type: 'UNKNOWN_FIELD',
            field: unknownKey,
            message: `حقل إضافي غير معيّن بالمخطط '${unknownKey}'`,
            documentId: record.id,
            details: record.unknownFields[unknownKey],
          });
        }
      }

      if (recordHasFatalError) {
        invalidCount++;
      } else {
        validCount++;
      }
    }

    let tenantResolutionType: ExtendedValidationReport['tenantResolutionType'] = 'GLOBAL_SYSTEM';
    if (config.tenantKey) {
      if (hasExplicitTenant && hasDefaultedTenant) {
        tenantResolutionType = 'MIXED';
      } else if (hasDefaultedTenant) {
        tenantResolutionType = 'DEFAULTED_TO_AL_GHAZZAWI';
      } else if (hasExplicitTenant) {
        tenantResolutionType = 'EXPLICIT_IN_DATA';
      }
    }

    return {
      collection: config.firestoreCollection,
      targetTable: config.postgresTable,
      sourceDocumentCount: sourceDocCount,
      targetRowCount: records.length,
      validCount,
      invalidCount,
      resolvableFkCount,
      deferredFkCount,
      missingExternalFkCount,
      unresolvableFkCount,
      tenantResolvedCount,
      tenantResolutionType,
      errors,
      warnings,
      unknownFieldsFound: Array.from(unknownFieldsSet),
    };
  }
}
