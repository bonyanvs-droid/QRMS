import { UserRole } from '../types';

/**
 * Single Canonical Source of Truth for Role-based Portal Navigation Routes.
 * Used exclusively by LoginModal, Demo sessions, and Route Guards to eliminate
 * any routing fragmentation, loops, or race conditions.
 */
export function getRolePortalRoute(role?: UserRole | string, tenantId?: string): string {
  switch (role) {
    case 'system_admin':
      return '/system-admin';
    case 'charity_supervisor':
      return '/admin';
    case 'supervisor':
      return '/supervisor';
    case 'teacher':
      return '/teacher';
    case 'parent':
      return '/parent';
    case 'student':
      return '/student';
    case 'campus_admin':
    case 'admin':
      return '/admin';
    default:
      return '/admin';
  }
}
