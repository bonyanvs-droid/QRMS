/**
 * QRMS Migration Engine - Core Type Definitions
 * 
 * Defines contracts for Mapping, Transformation, Validation, and Reporting
 * during the migration from Firestore to PostgreSQL.
 */

export type FirestoreValueType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'date' 
  | 'timestamp' 
  | 'jsonb' 
  | 'array' 
  | 'reference' 
  | 'custom';

export interface FieldMappingRule {
  firestoreField: string;
  postgresColumn: string;
  type: FirestoreValueType;
  required?: boolean;
  defaultValue?: any;
  transform?: (val: any, rawDoc?: any) => any;
  isForeignKey?: boolean;
  foreignKeyTable?: string;
}

export interface CollectionMigrationConfig {
  firestoreCollection: string;
  postgresTable: string;
  primaryKey: string; // Target PK column (always 'id')
  tenantKey?: string; // Target tenant column (e.g. 'tenant_id')
  organizationKey?: string; // Target organization column if applicable (e.g. 'organization_id')
  order: number;
  description: string;
  dependencies: string[]; // Tables that must be migrated before this table
  fieldMappings: FieldMappingRule[];
  flexibleFieldsJsonbColumn?: string; // Column to store unmapped/extra fields (e.g. plan_data, metadata)
  requiresSpecialHandling?: boolean;
  specialHandlingNotes?: string;
}

export interface TransformedRecord {
  id: string;
  tenantId?: string;
  organizationId?: string;
  data: Record<string, any>;
  unknownFields: Record<string, any>;
  rawFirestoreId: string;
}

export interface ValidationErrorItem {
  type: 'ID_MISSING' | 'ID_INVALID' | 'TENANT_MISSING' | 'FOREIGN_KEY_MISSING' | 'TYPE_MISMATCH' | 'REQUIRED_FIELD_MISSING';
  field?: string;
  message: string;
  documentId: string;
  details?: any;
}

export interface ValidationWarningItem {
  type: 'UNKNOWN_FIELD' | 'NULL_OPTIONAL_FIELD' | 'DEFAULT_APPLIED';
  field?: string;
  message: string;
  documentId: string;
  details?: any;
}

export interface CollectionValidationReport {
  collection: string;
  targetTable: string;
  sourceDocumentCount: number | 'N/A';
  targetRowCount: number | 'N/A';
  validCount: number;
  invalidCount: number;
  errors: ValidationErrorItem[];
  warnings: ValidationWarningItem[];
  unknownFieldsFound: string[];
}

export interface MigrationSummaryReport {
  timestamp: string;
  environment: string;
  isDryRun: boolean;
  quotaStatus: 'available' | 'exhausted' | 'untested';
  totalCollections: number;
  migrationOrder: string[];
  collectionReports: Record<string, CollectionValidationReport>;
  overallStatus: 'READY_FOR_REVIEW' | 'HAS_VALIDATION_ERRORS' | 'LIVE_DATA_UNAVAILABLE';
  notes: string[];
}
