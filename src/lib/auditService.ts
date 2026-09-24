import { AuditLog, UserRole } from '../types';
import { apiClient } from './api/apiClient';

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
 * Recursively cleans any object or array to strip keys with `undefined` values.
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
 * Appends an immutable record to the audit trail in PostgreSQL.
 */
export async function recordAuditLog(
  actorOrParams: CreateAuditLogParams | { id: string; name: string; role: any },
  entityType?: AuditLog['entityType'] | string,
  entityId?: string,
  action?: string,
  details?: any,
  tenantId?: string
): Promise<void> {
  if (isCurrentSessionDemo()) {
    return;
  }
  try {
    let logPayload: any;
    if ('userId' in actorOrParams) {
      logPayload = {
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...actorOrParams,
        timestamp: new Date().toISOString(),
      };
    } else {
      logPayload = {
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: actorOrParams.id,
        userName: actorOrParams.name,
        userRole: actorOrParams.role,
        action: action || 'UPDATE',
        entityType: entityType || 'system',
        entityId: entityId || '',
        entityName: typeof details === 'string' ? details : JSON.stringify(details || {}),
        tenantId,
        timestamp: new Date().toISOString(),
      };
    }

    await apiClient.post('/audit_logs', logPayload);
  } catch (error: any) {
    console.warn('Audit log write notice:', error?.message || error);
  }
}
