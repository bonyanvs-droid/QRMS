/**
 * QRMS Migration Engine - Type Transformers
 * 
 * Transforms Firestore native types (Timestamp, DocumentReference, nested Maps, Arrays)
 * into standard PostgreSQL compliant formats while strictly preserving original values.
 */

import { FieldMappingRule, TransformedRecord } from '../core/migrationTypes';

/**
 * Transforms any Firestore Timestamp, Date object, or numeric timestamp into an ISO-8601 string or Date.
 */
export function transformTimestamp(val: any): string | null {
  if (val === null || val === undefined) {
    return null;
  }
  
  // Firestore Timestamp with toDate() or seconds/nanoseconds
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    return val.toDate().toISOString();
  }
  
  if (typeof val === 'object' && typeof val.seconds === 'number') {
    const ms = val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1000000);
    return new Date(ms).toISOString();
  }
  
  if (val instanceof Date) {
    return val.toISOString();
  }
  
  if (typeof val === 'string') {
    // Valid ISO date string or date
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
    return val;
  }
  
  if (typeof val === 'number') {
    return new Date(val).toISOString();
  }
  
  return null;
}

/**
 * Transforms a Firestore DocumentReference into its raw string ID.
 * Avoids generating arbitrary strings or lost references.
 */
export function transformDocumentReference(val: any): string | null {
  if (val === null || val === undefined) {
    return null;
  }
  if (typeof val === 'string') {
    return val.trim();
  }
  // Firestore DocumentReference object has .id and .path
  if (typeof val === 'object' && typeof val.id === 'string') {
    return val.id;
  }
  if (typeof val === 'object' && typeof val.path === 'string') {
    const parts = val.path.split('/');
    return parts[parts.length - 1] || null;
  }
  return null;
}

/**
 * Transforms nested objects or arrays to JSONB-compatible structures.
 */
export function transformJsonb(val: any, fallback: any = {}): any {
  if (val === null || val === undefined) {
    return fallback;
  }
  if (typeof val === 'object') {
    // Deeply sanitize and serialize nested timestamps/references
    return deepSanitize(val);
  }
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

/**
 * Recursively sanitizes nested objects to prepare them for JSONB storage.
 */
export function deepSanitize(val: any): any {
  if (val === null || val === undefined) return val;
  
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    return val.toDate().toISOString();
  }
  
  if (typeof val === 'object' && typeof val.seconds === 'number' && typeof val.nanoseconds === 'number') {
    const ms = val.seconds * 1000 + Math.floor(val.nanoseconds / 1000000);
    return new Date(ms).toISOString();
  }
  
  if (Array.isArray(val)) {
    return val.map((item) => deepSanitize(item));
  }
  
  if (typeof val === 'object') {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      clean[k] = deepSanitize(v);
    }
    return clean;
  }
  
  return val;
}

/**
 * Main Record Transformer
 * Takes a raw Firestore document (with id) and maps it to a target PostgreSQL row payload.
 * Unknown fields are collected without guessing.
 */
export function transformDocument(
  docId: string,
  rawDoc: Record<string, any>,
  fieldMappings: FieldMappingRule[],
  primaryKeyCol: string = 'id',
  tenantKeyCol?: string,
  organizationKeyCol?: string
): TransformedRecord {
  const resultData: Record<string, any> = {};
  const unknownFields: Record<string, any> = {};
  
  // Mandatory: Preserve Firestore Document ID strictly as string primary key
  resultData[primaryKeyCol] = String(docId).trim();
  
  const mappedFirestoreFields = new Set<string>();
  
  // Apply explicit field mapping rules
  for (const rule of fieldMappings) {
    mappedFirestoreFields.add(rule.firestoreField);
    const rawValue = rawDoc[rule.firestoreField];
    
    if (rule.transform) {
      resultData[rule.postgresColumn] = rule.transform(rawValue, rawDoc);
      continue;
    }
    
    switch (rule.type) {
      case 'string':
        resultData[rule.postgresColumn] = rawValue !== undefined && rawValue !== null 
          ? String(rawValue).trim() 
          : (rule.defaultValue ?? null);
        break;
        
      case 'number':
        if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
          const num = Number(rawValue);
          resultData[rule.postgresColumn] = isNaN(num) ? (rule.defaultValue ?? 0) : num;
        } else {
          resultData[rule.postgresColumn] = rule.defaultValue ?? null;
        }
        break;
        
      case 'boolean':
        resultData[rule.postgresColumn] = typeof rawValue === 'boolean' 
          ? rawValue 
          : (rule.defaultValue ?? false);
        break;
        
      case 'date':
      case 'timestamp':
        resultData[rule.postgresColumn] = transformTimestamp(rawValue) ?? (rule.defaultValue ?? null);
        break;
        
      case 'reference':
        resultData[rule.postgresColumn] = transformDocumentReference(rawValue) ?? (rule.defaultValue ?? null);
        break;
        
      case 'jsonb':
      case 'array':
        resultData[rule.postgresColumn] = transformJsonb(rawValue, rule.defaultValue ?? (rule.type === 'array' ? [] : {}));
        break;
        
      default:
        resultData[rule.postgresColumn] = rawValue !== undefined ? rawValue : (rule.defaultValue ?? null);
    }
  }
  
  // Collect unknown fields without guessing
  for (const [key, val] of Object.entries(rawDoc)) {
    if (key === 'id' || mappedFirestoreFields.has(key)) {
      continue;
    }
    unknownFields[key] = val;
  }
  
  // Extract tenantId and organizationId if mapped
  const tenantId = tenantKeyCol ? resultData[tenantKeyCol] : undefined;
  const organizationId = organizationKeyCol ? resultData[organizationKeyCol] : undefined;
  
  return {
    id: resultData[primaryKeyCol],
    tenantId,
    organizationId,
    data: resultData,
    unknownFields,
    rawFirestoreId: docId,
  };
}
