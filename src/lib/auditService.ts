import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { AuditLog, UserRole } from '../types';

export interface CreateAuditLogParams {
  userId: string;
  userName: string;
  userRole: UserRole;
  action: AuditLog['action'];
  entityType: AuditLog['entityType'];
  entityId: string;
  entityName?: string;
  previousValue?: any;
  newValue?: any;
  notes?: string;
}

/**
 * Recursively cleans any object or array to strip keys with `undefined` values,
 * ensuring Firestore never rejects documents with "Unsupported field value: undefined".
 */
export function sanitizeFirestoreData<T>(val: T): T {
  if (val === undefined) {
    return null as unknown as T;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (val instanceof Date) {
    return val.toISOString() as unknown as T;
  }
  if (Array.isArray(val)) {
    return val
      .filter((item) => item !== undefined)
      .map((item) => sanitizeFirestoreData(item)) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    if (v !== undefined) {
      clean[k] = sanitizeFirestoreData(v);
    }
  }
  return clean as T;
}

import { isCurrentSessionDemo } from './demoGuard';

/**
 * Appends an immutable record to the audit trail in Firestore.
 */
export async function recordAuditLog(params: CreateAuditLogParams): Promise<void> {
  if (isCurrentSessionDemo()) {
    return;
  }
  try {
    const rawData = {
      ...params,
      timestamp: new Date().toISOString(),
    };
    const logData = sanitizeFirestoreData(rawData);
    const newDocRef = doc(collection(db, 'audit_logs'));
    await setDoc(newDocRef, logData, { merge: true });
  } catch (error: any) {
    console.warn('Audit log write notice:', error);
  }
}
