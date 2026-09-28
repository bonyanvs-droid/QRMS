import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { getDbPool } from '../config/db';

/**
 * Account Synchronization Service
 * ---------------------------------
 * Single source of truth for keeping `users` login accounts in sync with
 * operational records (`students`). Invoked by entityService hooks so every
 * write path — single upsert, bulk import, restore, direct API — produces the
 * same account state.
 *
 * Rules (approved design):
 * - student write  → ensure student login account + guardian parent account.
 * - guardian phone change → detach old parent, delete it when left childless.
 * - student delete → delete student account; detach + delete orphan parents.
 * - student archive → deactivate student account; deactivate childless parent.
 * - users write (staff) → keep login_identifier aligned with phone changes
 *   and report identifier collisions as non-blocking warnings.
 *
 * All helpers operate directly on a pg client/pool to avoid re-entering the
 * entityService hooks (no recursion).
 */

const STUDENT_DEFAULT_PASSWORD = 'Student@2026';
const PARENT_DEFAULT_PASSWORD = 'Parent@2026';
const SALT = '_ghazzawi_salt_2026';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password.trim() + SALT).digest('hex');
}

type Queryable = Pick<PoolClient, 'query'>;

function db(): Queryable {
  const pool = getDbPool();
  if (!pool) throw new Error('Database is not connected.');
  return pool as unknown as Queryable;
}

function digits(val: any): string {
  return String(val ?? '').replace(/\D/g, '');
}

/** Reads a field tolerating snake_case (DB rows) and camelCase (hydrated). */
function f(row: any, ...keys: string[]): any {
  for (const k of keys) {
    if (row && row[k] !== undefined && row[k] !== null) return row[k];
  }
  return undefined;
}

/** Saudi phone variants used to match loosely-stored phone columns. */
export function phoneVariants(raw: any): string[] {
  const rawStr = String(raw ?? '').trim();
  const d = digits(rawStr);
  const variants = new Set<string>([rawStr, d]);
  let core = d;
  if (core.startsWith('00966')) core = core.slice(5);
  else if (core.startsWith('966')) core = core.slice(3);
  if (core) {
    variants.add(core);
    if (!core.startsWith('0')) variants.add('0' + core);
    variants.add('966' + (core.startsWith('0') ? core.slice(1) : core));
  }
  return Array.from(variants).filter(Boolean);
}

/** Guardian login phone: mother when relationship is «أم», else parent phone. */
export function guardianPhoneOf(student: any): string {
  const rel = String(f(student, 'guardian_relationship', 'guardianRelationship') ?? '');
  const mother = f(student, 'mother_phone', 'motherPhone');
  const father = f(student, 'parent_phone', 'parentPhone');
  if (rel === 'أم' && digits(mother)) return String(mother).trim();
  return String(father ?? '').trim();
}

export interface SyncWarning {
  type: 'identifier_collision' | 'orphan_parent_deactivated' | 'sync_error';
  message: string;
  details?: Record<string, any>;
}

/* ------------------------------------------------------------------ */
/* Student user account                                                */
/* ------------------------------------------------------------------ */

async function findStudentUsers(q: Queryable, tenantId: string, studentId: string, nationalId: string) {
  const res = await q.query(
    `SELECT * FROM users
      WHERE tenant_id = $1 AND role = 'student' AND (
        student_id = $2
        OR id = $3
        OR ($4 <> '' AND id = $5)
        OR ($4 <> '' AND national_id = $4)
      )`,
    [tenantId, studentId, `usr_${studentId}`, nationalId, `usr_stu_${nationalId}`]
  );
  return res.rows as any[];
}

async function ensureStudentUser(q: Queryable, student: any): Promise<void> {
  const sid = String(f(student, 'id'));
  const tenantId = String(f(student, 'tenant_id', 'tenantId') ?? '');
  const nationalId = String(f(student, 'national_id', 'nationalId') ?? '').trim();
  const name = String(f(student, 'full_name', 'fullName', 'name') ?? 'طالب');
  const halaqahId = f(student, 'halaqah_id', 'halaqahId') ?? null;
  const isActive = f(student, 'is_active', 'isActive') !== false && f(student, 'is_archived', 'isArchived') !== true;
  const gPhone = guardianPhoneOf(student);

  const existing = await findStudentUsers(q, tenantId, sid, nationalId);
  if (existing.length > 0) {
    await q.query(
      `UPDATE users SET
         name = $2, full_name = $2,
         national_id = COALESCE(NULLIF($3, ''), national_id),
         login_identifier = COALESCE(NULLIF($3, ''), login_identifier),
         phone = $4, halaqah_id = $5, is_active = $6, updated_at = NOW()
       WHERE id = $1`,
      [existing[0].id, name, nationalId, gPhone || null, halaqahId, isActive]
    );
    return;
  }

  const userId = nationalId ? `usr_stu_${nationalId}` : `usr_${sid}`;
  await q.query(
    `INSERT INTO users (id, tenant_id, name, full_name, phone, national_id, login_identifier,
                        password_hash, role, student_id, halaqah_id, is_active,
                        must_change_password, is_archived, created_at, updated_at)
     VALUES ($1,$2,$3,$3,$4,$5,$6,$7,'student',$8,$9,$10,TRUE,FALSE,NOW(),NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, full_name = EXCLUDED.full_name, phone = EXCLUDED.phone,
       national_id = EXCLUDED.national_id, student_id = EXCLUDED.student_id,
       halaqah_id = EXCLUDED.halaqah_id, is_active = EXCLUDED.is_active, updated_at = NOW()`,
    [userId, tenantId, name, gPhone || null, nationalId || null, nationalId || userId,
     hashPassword(STUDENT_DEFAULT_PASSWORD), sid, halaqahId, isActive]
  );
}

async function deleteStudentUsers(q: Queryable, tenantId: string, studentId: string, nationalId: string): Promise<void> {
  await q.query(
    `DELETE FROM users
      WHERE tenant_id = $1 AND role = 'student' AND (
        student_id = $2 OR id = $3 OR ($4 <> '' AND national_id = $4) OR ($4 <> '' AND id = $5)
      )`,
    [tenantId, studentId, `usr_${studentId}`, nationalId, `usr_stu_${nationalId}`]
  );
}

/* ------------------------------------------------------------------ */
/* Parent accounts                                                     */
/* ------------------------------------------------------------------ */

async function findParentByPhone(q: Queryable, tenantId: string, phone: string) {
  const variants = phoneVariants(phone);
  const res = await q.query(
    `SELECT * FROM users
      WHERE tenant_id = $1 AND role = 'parent'
        AND (phone = ANY($2) OR login_identifier = ANY($2))`,
    [tenantId, variants]
  );
  return res.rows[0] as any | undefined;
}

async function ensureParentUser(q: Queryable, student: any): Promise<void> {
  const sid = String(f(student, 'id'));
  const tenantId = String(f(student, 'tenant_id', 'tenantId') ?? '');
  const gPhone = guardianPhoneOf(student);
  const gDigits = digits(gPhone);
  if (!gDigits) return;

  const parentName =
    String(f(student, 'parent_name', 'parentName') ?? '').trim() ||
    `ولي أمر الطالب (${String(f(student, 'full_name', 'fullName', 'name') ?? '')})`;
  const isActive = f(student, 'is_active', 'isActive') !== false && f(student, 'is_archived', 'isArchived') !== true;

  const existing = await findParentByPhone(q, tenantId, gPhone);
  if (existing) {
    await q.query(
      `UPDATE users SET
         student_ids = CASE
           WHEN student_ids @> $2::jsonb THEN student_ids
           ELSE COALESCE(student_ids, '[]'::jsonb) || $2::jsonb
         END,
         name = COALESCE(NULLIF($3, ''), name),
         full_name = COALESCE(NULLIF($3, ''), full_name),
         is_active = CASE WHEN $4 THEN TRUE ELSE is_active END,
         updated_at = NOW()
       WHERE id = $1`,
      [existing.id, JSON.stringify([sid]), parentName, isActive]
    );
    return;
  }

  await q.query(
    `INSERT INTO users (id, tenant_id, name, full_name, phone, login_identifier,
                        password_hash, role, student_ids, is_active,
                        must_change_password, is_archived, created_at, updated_at)
     VALUES ($1,$2,$3,$3,$4,$4,$5,'parent',$6::jsonb,TRUE,TRUE,FALSE,NOW(),NOW())
     ON CONFLICT (id) DO UPDATE SET
       student_ids = CASE
         WHEN users.student_ids @> EXCLUDED.student_ids THEN users.student_ids
         ELSE COALESCE(users.student_ids, '[]'::jsonb) || EXCLUDED.student_ids
       END,
       is_active = TRUE, is_archived = FALSE, updated_at = NOW()`,
    [`usr_parent_${gDigits}`, tenantId, parentName, gPhone, hashPassword(PARENT_DEFAULT_PASSWORD), JSON.stringify([sid])]
  );
}

/** Counts active students in the tenant still linked to a guardian phone. */
async function countActiveChildrenForPhone(q: Queryable, tenantId: string, phone: string): Promise<number> {
  const variants = phoneVariants(phone);
  const res = await q.query(
    `SELECT COUNT(*)::int AS c FROM students
      WHERE tenant_id = $1 AND COALESCE(is_active, TRUE) = TRUE AND COALESCE(is_archived, FALSE) = FALSE
        AND (parent_phone = ANY($2) OR mother_phone = ANY($2))`,
    [tenantId, variants]
  );
  return res.rows[0]?.c ?? 0;
}

/**
 * Safeguarded final delete for a parent account: only when it is a pure
 * parent record (no staff role) with no remaining student links.
 * Falls back to deactivation if the delete is refused or fails.
 */
async function deleteOrDeactivateParent(q: Queryable, parentId: string, mode: 'delete' | 'deactivate'): Promise<void> {
  if (mode === 'deactivate') {
    await q.query(`UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1 AND role = 'parent'`, [parentId]);
    return;
  }
  try {
    const res = await q.query(
      `DELETE FROM users
        WHERE id = $1 AND role = 'parent' AND staff_role IS NULL
          AND COALESCE(student_ids, '[]'::jsonb) = '[]'::jsonb`,
      [parentId]
    );
    if (res.rowCount === 0) {
      await q.query(`UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1 AND role = 'parent'`, [parentId]);
    }
  } catch (err) {
    console.warn(`[SYNC] Parent delete fallback to deactivate for ${parentId}:`, err);
    await q.query(`UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1 AND role = 'parent'`, [parentId]);
  }
}

/**
 * Detaches a student from every parent account carrying it in student_ids,
 * then removes (or deactivates) parents left with zero linked children and
 * zero active students matching their phone inside the same tenant.
 */
async function detachStudentFromParents(
  q: Queryable,
  tenantId: string,
  studentId: string,
  guardianPhones: string[],
  mode: 'delete' | 'deactivate',
  matchByStudentIds = true
): Promise<void> {
  const sidArray = JSON.stringify([studentId]);
  const phoneList = guardianPhones.map(digits).filter(Boolean);
  const variants = Array.from(new Set(phoneList.flatMap(phoneVariants)));

  const res = await q.query(
    `SELECT * FROM users
      WHERE tenant_id = $1 AND role = 'parent' AND (
        ($4::boolean AND student_ids @> $2::jsonb)
        OR ($3::text[] <> '{}' AND (phone = ANY($3) OR login_identifier = ANY($3)))
      )`,
    [tenantId, sidArray, variants, matchByStudentIds]
  );

  for (const parent of res.rows as any[]) {
    const currentIds: string[] = Array.isArray(parent.student_ids) ? parent.student_ids : [];
    const remaining = currentIds.filter((x) => x !== studentId);

    const phoneMatches = !parent.phone || phoneList.includes(digits(parent.phone));
    const shouldDetach = currentIds.includes(studentId) || phoneMatches;
    if (!shouldDetach) continue;

    if (currentIds.includes(studentId)) {
      await q.query(`UPDATE users SET student_ids = $2::jsonb, updated_at = NOW() WHERE id = $1`, [parent.id, JSON.stringify(remaining)]);
    }

    const stillLinked = currentIds.includes(studentId) ? remaining.length : currentIds.length;
    const activeChildren = parent.phone ? await countActiveChildrenForPhone(q, tenantId, parent.phone) : 0;

    if (stillLinked === 0 && activeChildren === 0) {
      await deleteOrDeactivateParent(q, parent.id, mode);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Public hooks                                                        */
/* ------------------------------------------------------------------ */

/**
 * After a single students write (insert/update).
 * `prevRow` is the row state before the write (null for inserts).
 */
export async function syncStudentWrite(q: Queryable | undefined, student: any, prevRow: any | null): Promise<void> {
  const client = q ?? db();
  const sid = String(f(student, 'id'));
  const tenantId = String(f(student, 'tenant_id', 'tenantId') ?? '');
  if (!tenantId) return;

  const isActive = f(student, 'is_active', 'isActive') !== false && f(student, 'is_archived', 'isArchived') !== true;

  if (isActive) {
    await ensureStudentUser(client, student);
    await ensureParentUser(client, student);
  } else {
    // Archived/deactivated student → deactivate accounts (archive semantics).
    const nationalId = String(f(student, 'national_id', 'nationalId') ?? '').trim();
    const users = await findStudentUsers(client, tenantId, sid, nationalId);
    for (const u of users) {
      await client.query(`UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1`, [u.id]);
    }
    const phones = [guardianPhoneOf(student), String(f(student, 'parent_phone', 'parentPhone') ?? '')];
    await detachStudentFromParents(client, tenantId, sid, phones, 'deactivate');
  }

  // Guardian phone changed → detach from the previous guardian account.
  // Phone-only matching so the freshly-linked new guardian is never touched.
  if (prevRow) {
    const oldPhone = digits(guardianPhoneOf(prevRow));
    const newPhone = digits(guardianPhoneOf(student));
    if (oldPhone && oldPhone !== newPhone) {
      await detachStudentFromParents(client, tenantId, sid, [oldPhone], 'delete', false);
    }
  }
}

/**
 * After a students delete — hard cleanup per the approved "no orphans" rule.
 */
export async function syncStudentDeleted(q: Queryable | undefined, deletedRow: any): Promise<void> {
  const client = q ?? db();
  const sid = String(f(deletedRow, 'id'));
  const tenantId = String(f(deletedRow, 'tenant_id', 'tenantId') ?? '');
  if (!tenantId) return;

  // 1. Delete student user account(s)
  const nationalId = String(f(deletedRow, 'national_id', 'nationalId') ?? '').trim();
  await deleteStudentUsers(client, tenantId, sid, nationalId);

  // 2. Cascade delete operational child rows to prevent orphaned database records
  try {
    await client.query('DELETE FROM quran_plans WHERE tenant_id = $1 AND student_id = $2', [tenantId, sid]);
    await client.query('DELETE FROM student_points WHERE tenant_id = $1 AND student_id = $2', [tenantId, sid]);
    await client.query('DELETE FROM student_badges WHERE tenant_id = $1 AND student_id = $2', [tenantId, sid]);
    await client.query('DELETE FROM daily_session_records WHERE tenant_id = $1 AND student_id = $2', [tenantId, sid]);
  } catch (cascadeErr) {
    console.warn('[SYNC] Operational cascade cleanup warning on student delete:', cascadeErr);
  }

  const phones = [
    guardianPhoneOf(deletedRow),
    String(f(deletedRow, 'parent_phone', 'parentPhone') ?? ''),
    String(f(deletedRow, 'mother_phone', 'motherPhone') ?? ''),
  ];
  await detachStudentFromParents(client, tenantId, sid, phones, 'delete');
}

/**
 * Bulk path: batches the expensive lookups, then per-row writes inside the
 * caller's transaction client.
 */
export async function syncStudentsBulk(q: PoolClient, students: any[], prevRows: Map<string, any>): Promise<void> {
  if (!students.length) return;
  const tenantId = String(f(students[0], 'tenant_id', 'tenantId') ?? '');
  if (!tenantId) return;

  const active = students.filter(
    (s) => f(s, 'is_active', 'isActive') !== false && f(s, 'is_archived', 'isArchived') !== true
  );
  const inactive = students.filter((s) => !active.includes(s));

  // 1. Batch-fetch existing student users
  const ids = students.map((s) => String(f(s, 'id')));
  const natIds = students.map((s) => String(f(s, 'national_id', 'nationalId') ?? '').trim()).filter(Boolean);
  const existingStudentUsers = await q.query(
    `SELECT * FROM users WHERE tenant_id = $1 AND role = 'student' AND (
       student_id = ANY($2) OR id = ANY($3) OR (national_id <> '' AND national_id = ANY($4))
     )`,
    [tenantId, ids, ids.map((i) => `usr_${i}`), natIds]
  );
  const studentUserByStudentId = new Map<string, any>();
  const studentUserById = new Map<string, any>();
  const studentUserByNatId = new Map<string, any>();
  for (const u of existingStudentUsers.rows as any[]) {
    if (u.student_id) studentUserByStudentId.set(u.student_id, u);
    studentUserById.set(u.id, u);
    if (u.national_id) studentUserByNatId.set(u.national_id, u);
  }

  // 2. Batch-fetch existing parent users by guardian phones
  const guardianPhones = active.map(guardianPhoneOf).map(digits).filter(Boolean);
  const uniquePhones = Array.from(new Set(guardianPhones));
  const allVariants = Array.from(new Set(uniquePhones.flatMap(phoneVariants)));
  const existingParents = allVariants.length
    ? await q.query(
        `SELECT * FROM users WHERE tenant_id = $1 AND role = 'parent' AND (phone = ANY($2) OR login_identifier = ANY($2))`,
        [tenantId, allVariants]
      )
    : { rows: [] as any[] };
  const parentByPhone = new Map<string, any>();
  for (const p of existingParents.rows as any[]) {
    for (const v of phoneVariants(p.phone)) parentByPhone.set(digits(v), p);
    for (const v of phoneVariants(p.login_identifier)) parentByPhone.set(digits(v), p);
  }

  // 3. Per-row writes (bounded set of queries, shared transaction)
  for (const s of active) {
    await ensureStudentUser(q, s);
    await ensureParentUser(q, s);
  }

  // 4. Archived/deactivated students in the batch
  for (const s of inactive) {
    await syncStudentWrite(q, s, prevRows.get(String(f(s, 'id'))) ?? null);
  }

  // 5. Guardian-phone changes → detach from previous guardians (phone-only
  //    matching so freshly-linked new guardians are never touched)
  for (const s of students) {
    const prev = prevRows.get(String(f(s, 'id')));
    if (!prev) continue;
    const oldPhone = digits(guardianPhoneOf(prev));
    const newPhone = digits(guardianPhoneOf(s));
    if (oldPhone && oldPhone !== newPhone) {
      await detachStudentFromParents(q, tenantId, String(f(s, 'id')), [oldPhone], 'delete', false);
    }
  }
}

/**
 * After a users write:
 * - staff: keep login_identifier tracking phone changes (unless a custom
 *   identifier was explicitly set).
 * - any role: report identifier collisions with other active accounts.
 */
export async function syncUserWrite(userRow: any, prevRow: any | null): Promise<SyncWarning[]> {
  const q = db();
  const warnings: SyncWarning[] = [];
  const id = String(f(userRow, 'id'));
  const tenantId = String(f(userRow, 'tenant_id', 'tenantId') ?? '');
  const role = String(f(userRow, 'role') ?? '');
  const staffRole = f(userRow, 'staff_role', 'staffRole');
  const isStaff = staffRole || !['parent', 'student'].includes(role);

  // 1. Staff phone change → login_identifier follows (only when it was not
  //    explicitly customized away from the old phone).
  if (isStaff && prevRow) {
    const oldPhone = String(f(prevRow, 'phone') ?? '').trim();
    const newPhone = String(f(userRow, 'phone') ?? '').trim();
    const oldLogin = String(f(prevRow, 'login_identifier') ?? '').trim();
    const loginWasDefault = !oldLogin || oldLogin === oldPhone || digits(oldLogin) === digits(oldPhone);
    if (newPhone && digits(newPhone) !== digits(oldPhone) && loginWasDefault) {
      await q.query(`UPDATE users SET login_identifier = $2, updated_at = NOW() WHERE id = $1`, [id, newPhone]);
      userRow.login_identifier = newPhone;
      userRow.loginIdentifier = newPhone;
    }
  }

  // 1b. Teacher scope change → halaqahs.assistant_teachers stays consistent.
  // Halaqahs granted via "نطاق الحلقات" (assigned_halaqah_ids) mean the teacher
  // is an assistant there; removals detach him again.
  const isTeacher = role === 'teacher' || staffRole === 'teacher';
  if (isTeacher && prevRow && tenantId) {
    const oldScope: string[] = Array.isArray(f(prevRow, 'assigned_halaqah_ids')) ? f(prevRow, 'assigned_halaqah_ids') : [];
    const newScope: string[] = Array.isArray(f(userRow, 'assigned_halaqah_ids')) ? f(userRow, 'assigned_halaqah_ids') : [];
    const added = newScope.filter((hid) => !oldScope.includes(hid));
    const removed = oldScope.filter((hid) => !newScope.includes(hid));
    const displayName = String(f(userRow, 'full_name', 'fullName') || f(userRow, 'name') || 'معلم');

    for (const hid of added) {
      await q.query(
        `UPDATE halaqahs
            SET assistant_teachers = COALESCE(assistant_teachers, '[]'::jsonb) || $2::jsonb,
                updated_at = NOW()
          WHERE tenant_id = $1 AND id = $3
            AND COALESCE(teacher_id, '') <> $4
            AND NOT (COALESCE(assistant_teachers, '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('id', $4)))`,
        [tenantId, JSON.stringify([{ id, name: displayName }]), hid, id]
      );
    }
    for (const hid of removed) {
      await q.query(
        `UPDATE halaqahs
            SET assistant_teachers = COALESCE((
                  SELECT jsonb_agg(elem) FROM jsonb_array_elements(assistant_teachers) elem
                  WHERE elem->>'id' <> $3
                ), '[]'::jsonb),
                updated_at = NOW()
          WHERE tenant_id = $1 AND id = $2
            AND COALESCE(assistant_teachers, '[]'::jsonb)::text LIKE '%' || $3 || '%'`,
        [tenantId, hid, id]
      );
    }
  }

  // 2. Identifier collision warning (non-blocking)
  const ident = String(f(userRow, 'login_identifier', 'loginIdentifier') ?? '').trim();
  const phone = String(f(userRow, 'phone') ?? '').trim();
  const variants = Array.from(new Set([...phoneVariants(ident), ...phoneVariants(phone)]));
  if (variants.length && tenantId) {
    const coll = await q.query(
      `SELECT id, name, role FROM users
        WHERE tenant_id = $1 AND id <> $2 AND COALESCE(is_active, TRUE) = TRUE
          AND COALESCE(is_archived, FALSE) = FALSE
          AND (login_identifier = ANY($3) OR phone = ANY($3))`,
      [tenantId, id, variants]
    );
    for (const c of coll.rows as any[]) {
      if (c.role === role) continue;
      warnings.push({
        type: 'identifier_collision',
        message: `معرف الدخول يتطابق مع حساب آخر نشط: ${c.name} (${c.role}) — سيظهر للمستخدم اختيار الحساب عند الدخول.`,
        details: { otherUserId: c.id, otherRole: c.role },
      });
    }
  }

  return warnings;
}
