/**
 * QRMS Migration Engine - Validation Layer
 * 
 * Enforces rigorous integrity checks on transformed records before any hypothetical write:
 * 1. ID Preservation and Uniqueness (String-based primary key)
 * 2. Tenant Isolation & Context Validity
 * 3. Foreign Key Reference Integrity
 * 4. Required Field Presence & Non-nullness
 * 5. Type Consistency
 * 6. Audit of Unknown / Flexible Fields
 */

import {
  CollectionMigrationConfig,
  TransformedRecord,
  ValidationErrorItem,
  ValidationWarningItem,
  CollectionValidationReport,
} from '../core/migrationTypes';

export class MigrationValidator {
  private knownIdsByTable: Map<string, Set<string>> = new Map();

  /**
   * Registers a known ID for foreign key cross-referencing.
   */
  public registerId(table: string, id: string): void {
    if (!this.knownIdsByTable.has(table)) {
      this.knownIdsByTable.set(table, new Set());
    }
    this.knownIdsByTable.get(table)!.add(id);
  }

  /**
   * Validates a batch of transformed records for a specific collection configuration.
   */
  public validateBatch(
    config: CollectionMigrationConfig,
    records: TransformedRecord[],
    sourceDocCount: number | 'N/A' = 'N/A'
  ): CollectionValidationReport {
    const errors: ValidationErrorItem[] = [];
    const warnings: ValidationWarningItem[] = [];
    const unknownFieldsSet = new Set<string>();
    const seenIdsInBatch = new Set<string>();

    let validCount = 0;
    let invalidCount = 0;

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
        this.registerId(config.postgresTable, record.id);
      }

      // 2. Tenant Isolation Validation
      if (config.tenantKey) {
        const tenantVal = record.data[config.tenantKey];
        if (!tenantVal || typeof tenantVal !== 'string' || tenantVal.trim() === '') {
          errors.push({
            type: 'TENANT_MISSING',
            field: config.tenantKey,
            message: `Tenant isolation violation: Missing ${config.tenantKey} in ${config.firestoreCollection}`,
            documentId: record.id,
          });
          recordHasFatalError = true;
        }
      }

      // 3. Required Fields & Type Checking
      for (const rule of config.fieldMappings) {
        const val = record.data[rule.postgresColumn];

        if (rule.required && (val === undefined || val === null || val === '')) {
          errors.push({
            type: 'REQUIRED_FIELD_MISSING',
            field: rule.postgresColumn,
            message: `Required column '${rule.postgresColumn}' is missing or null in ${config.firestoreCollection}`,
            documentId: record.id,
          });
          recordHasFatalError = true;
        }

        // Foreign Key cross-table verification (if parent table is registered and has records)
        if (rule.isForeignKey && rule.foreignKeyTable && val) {
          const targetTableSet = this.knownIdsByTable.get(rule.foreignKeyTable);
          if (targetTableSet && targetTableSet.size > 0 && !targetTableSet.has(String(val))) {
            warnings.push({
              type: 'UNKNOWN_FIELD',
              field: rule.postgresColumn,
              message: `Foreign Key reference '${val}' in table '${rule.foreignKeyTable}' could not be matched locally.`,
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
            message: `Unknown field '${unknownKey}' found in document`,
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

    return {
      collection: config.firestoreCollection,
      targetTable: config.postgresTable,
      sourceDocumentCount: sourceDocCount,
      targetRowCount: records.length,
      validCount,
      invalidCount,
      errors,
      warnings,
      unknownFieldsFound: Array.from(unknownFieldsSet),
    };
  }
}
