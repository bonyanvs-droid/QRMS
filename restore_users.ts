import crypto from 'crypto';
import { getDbPool } from './server/config/db';
import { executeQuery } from './server/db/query';

// Password hashing function matching the project's logic
function hashPassword(password: string): string {
  const salted = password.trim() + '_ghazzawi_salt_2026';
  return crypto.createHash('sha256').update(salted).digest('hex');
}

const supervisors = [
  {
    id: 'usr_sup_1789366038210',
    tenant_id: 'tenant_1789346881267',
    role: 'supervisor',
    staff_role: 'supervisor',
    name: 'هيثم الحارثي أبو عمر',
    full_name: 'هيثم الحارثي أبو عمر',
    phone: '0540647097',
    login_identifier: '0540647097',
    is_active: true,
    is_archived: false,
    supervisor_archived: false,
    must_change_password: true,
    permission_mode: 'role_defaults',
    supervisor_scope: JSON.stringify({ type: 'all_halaqahs' }),
    assigned_stage_ids: JSON.stringify([]),
    assigned_halaqah_ids: JSON.stringify([])
  },
  {
    id: 'usr_sup_1789366304523',
    tenant_id: 'tenant_1789346881267',
    role: 'supervisor',
    staff_role: 'supervisor',
    name: 'عبدالملك سليم المرواني',
    full_name: 'عبدالملك سليم المرواني',
    phone: '0531649692',
    login_identifier: '0531649692',
    is_active: true,
    is_archived: false,
    supervisor_archived: false,
    must_change_password: true,
    permission_mode: 'role_defaults',
    supervisor_scope: JSON.stringify({ type: 'all_halaqahs' }),
    assigned_stage_ids: JSON.stringify([]),
    assigned_halaqah_ids: JSON.stringify([])
  },
  {
    id: 'usr_sup_1789366432190',
    tenant_id: 'tenant_1789346881267',
    role: 'supervisor',
    staff_role: 'supervisor',
    name: 'محمد الصادق الورتاني',
    full_name: 'محمد الصادق الورتاني',
    phone: '0541235689',
    login_identifier: '0541235689',
    is_active: true,
    is_archived: false,
    supervisor_archived: false,
    must_change_password: true,
    permission_mode: 'role_defaults',
    supervisor_scope: JSON.stringify({ type: 'all_halaqahs' }),
    assigned_stage_ids: JSON.stringify([]),
    assigned_halaqah_ids: JSON.stringify([])
  },
  {
    id: 'usr_sup_1789366555122',
    tenant_id: 'tenant_1789346881267',
    role: 'supervisor',
    staff_role: 'supervisor',
    name: 'فهد عبدالهادي اللحياني',
    full_name: 'فهد عبدالهادي اللحياني',
    phone: '0558741236',
    login_identifier: '0558741236',
    is_active: true,
    is_archived: false,
    supervisor_archived: false,
    must_change_password: true,
    permission_mode: 'role_defaults',
    supervisor_scope: JSON.stringify({ type: 'all_halaqahs' }),
    assigned_stage_ids: JSON.stringify([]),
    assigned_halaqah_ids: JSON.stringify([])
  },
  {
    id: 'usr_sup_1789366777011',
    tenant_id: 'tenant_1789346881267',
    role: 'supervisor',
    staff_role: 'supervisor',
    name: 'فيصل العتيبي أبو ريان',
    full_name: 'فيصل العتيبي أبو ريان',
    phone: '0563214587',
    login_identifier: '0563214587',
    is_active: true,
    is_archived: false,
    supervisor_archived: false,
    must_change_password: true,
    permission_mode: 'role_defaults',
    supervisor_scope: JSON.stringify({ type: 'all_halaqahs' }),
    assigned_stage_ids: JSON.stringify([]),
    assigned_halaqah_ids: JSON.stringify([])
  }
];

async function main() {
  const pool = getDbPool();
  if (!pool) {
    console.error('Database connection pool is not configured.');
    process.exit(1);
  }

  try {
    // 1. Ensure Tenant exists to satisfy foreign key constraint
    console.log('Ensuring target tenant exists...');
    await executeQuery(`
      INSERT INTO tenants (id, slug, name, city, district, supervisor_name, contact_phone, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, supervisor_name = EXCLUDED.supervisor_name, contact_phone = EXCLUDED.contact_phone;
    `, [
      'tenant_1789346881267',
      'ghazzawi',
      'مجمع الغزاوي القرآني',
      'جدة',
      'الصفا',
      'هيثم الحارثي أبو عمر',
      '0540647097'
    ]);
    console.log('Tenant tenant_1789346881267 is ready.');

    // 2. Hash the password for each supervisor and insert/upsert
    console.log('Restoring supervisor accounts with SHA-256 salted hashes...');
    const hashedPwd = hashPassword('Admin@123456');

    for (const sup of supervisors) {
      await executeQuery(`
        INSERT INTO users (
          id, tenant_id, role, staff_role, name, full_name, phone, login_identifier, 
          password_hash, is_active, is_archived, supervisor_archived, must_change_password, 
          permission_mode, supervisor_scope, assigned_stage_ids, assigned_halaqah_ids, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
          tenant_id = EXCLUDED.tenant_id,
          role = EXCLUDED.role,
          staff_role = EXCLUDED.staff_role,
          name = EXCLUDED.name,
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          login_identifier = EXCLUDED.login_identifier,
          password_hash = EXCLUDED.password_hash,
          is_active = EXCLUDED.is_active,
          is_archived = EXCLUDED.is_archived,
          supervisor_archived = EXCLUDED.supervisor_archived,
          must_change_password = EXCLUDED.must_change_password,
          permission_mode = EXCLUDED.permission_mode,
          supervisor_scope = EXCLUDED.supervisor_scope,
          assigned_stage_ids = EXCLUDED.assigned_stage_ids,
          assigned_halaqah_ids = EXCLUDED.assigned_halaqah_ids,
          archived_at = NULL,
          archived_by = NULL,
          archive_reason = NULL,
          archive_type = NULL,
          updated_at = NOW();
      `, [
        sup.id,
        sup.tenant_id,
        sup.role,
        sup.staff_role,
        sup.name,
        sup.full_name,
        sup.phone,
        sup.login_identifier,
        hashedPwd,
        sup.is_active,
        sup.is_archived,
        sup.supervisor_archived,
        sup.must_change_password,
        sup.permission_mode,
        sup.supervisor_scope,
        sup.assigned_stage_ids,
        sup.assigned_halaqah_ids
      ]);
      console.log(`Supervisor "${sup.name}" (${sup.id}) successfully restored/updated.`);
    }

    console.log('All 5 Supervisor accounts have been successfully restored!');
  } catch (error) {
    console.error('Error during supervisor restoration:', error);
  } finally {
    // End pool cleanly so script exits
    await pool.end();
  }
}

main();
