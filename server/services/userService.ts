import { executeQuery, executeQuerySingle } from '../db/query';
import { User } from '../../src/types';

// Fields to select excluding password hashes for safety, with halaqah_name from halaqahs table
const SAFE_USER_SELECT = `
  u.id, u.tenant_id, u.organization_id, u.name, u.full_name, u.phone, u.email,
  u.national_id, u.login_identifier, u.role, u.staff_role, u.halaqah_id,
  h.name AS halaqah_name,
  u.stage_id, u.student_id, u.teacher_id, u.student_ids, u.supervision_mode,
  u.is_active, u.must_change_password, u.permission_mode, u.role_permissions_overrides,
  u.custom_permissions, u.temporary_custom_permissions, u.supervisor_scope,
  u.assigned_stage_ids, u.assigned_halaqah_ids, u.is_all_halaqahs, u.delegations,
  u.is_archived, u.teacher_archived, u.supervisor_archived, u.archive_type,
  u.archived_at, u.archived_by, u.archive_reason,
  u.created_at, u.updated_at
`;

export async function getUsersByTenant(tenantId: string): Promise<User[]> {
  const query = `
    SELECT ${SAFE_USER_SELECT}
    FROM users u
    LEFT JOIN halaqahs h ON u.halaqah_id = h.id
    WHERE u.tenant_id = $1 AND (u.is_archived = FALSE OR u.is_archived IS NULL)
    ORDER BY u.name ASC
  `;
  return executeQuery<User>(query, [tenantId]);
}

export async function getUserById(userId: string, tenantId?: string): Promise<User | null> {
  let query: string;
  let params: any[];

  if (tenantId) {
    query = `
      SELECT ${SAFE_USER_SELECT}
      FROM users u
      LEFT JOIN halaqahs h ON u.halaqah_id = h.id
      WHERE u.id = $1 AND u.tenant_id = $2
      LIMIT 1
    `;
    params = [userId, tenantId];
  } else {
    query = `
      SELECT ${SAFE_USER_SELECT}
      FROM users u
      LEFT JOIN halaqahs h ON u.halaqah_id = h.id
      WHERE u.id = $1
      LIMIT 1
    `;
    params = [userId];
  }

  return executeQuerySingle<User>(query, params);
}
