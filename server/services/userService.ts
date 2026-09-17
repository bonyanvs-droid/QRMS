import { executeQuery, executeQuerySingle } from '../db/query';
import { User } from '../../src/types';

// Fields to select excluding password hashes for safety
const SAFE_USER_COLUMNS = `
  id, name, full_name, phone, national_id, login_identifier, email,
  role, staff_role, halaqah_id, halaqah_name, tenant_id, organization_id,
  is_active, must_change_password, custom_permissions, temporary_custom_permissions,
  created_at, updated_at
`;

export async function getUsersByTenant(tenantId: string): Promise<User[]> {
  const query = `
    SELECT ${SAFE_USER_COLUMNS}
    FROM users
    WHERE tenant_id = $1 AND (is_archived = FALSE OR is_archived IS NULL)
    ORDER BY name ASC
  `;
  return executeQuery<User>(query, [tenantId]);
}

export async function getUserById(userId: string, tenantId?: string): Promise<User | null> {
  let query: string;
  let params: any[];

  if (tenantId) {
    query = `
      SELECT ${SAFE_USER_COLUMNS}
      FROM users
      WHERE id = $1 AND tenant_id = $2
      LIMIT 1
    `;
    params = [userId, tenantId];
  } else {
    query = `
      SELECT ${SAFE_USER_COLUMNS}
      FROM users
      WHERE id = $1
      LIMIT 1
    `;
    params = [userId];
  }

  return executeQuerySingle<User>(query, params);
}
