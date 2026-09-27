/**
 * Account Reconciliation Script
 * -----------------------------
 * Read-only audit by default; pass --apply to execute fixes.
 *
 * Checks, per tenant:
 *  1. student users with no matching students row            → delete (apply)
 *  2. parent users with zero linked/active children           → delete (apply)
 *  3. active students with no login account                   → create (apply)
 *  4. guardian phones with no parent account                  → create (apply)
 *  5. stale entries inside parent.student_ids                 → clean (apply)
 *  6. login-identifier collisions across roles                → report only
 *
 * Usage:
 *   npx tsx scripts/reconcileAccounts.ts            # report only
 *   npx tsx scripts/reconcileAccounts.ts --apply    # apply fixes
 */
import '../server/config/env';
import { getDbPool } from '../server/config/db';
import {
  syncStudentWrite,
  syncStudentDeleted,
  guardianPhoneOf,
  phoneVariants,
} from '../server/services/accountSyncService';

const APPLY = process.argv.includes('--apply');

async function main() {
  const pool = getDbPool();
  if (!pool) {
    console.error('DATABASE_URL is not configured.');
    process.exit(1);
  }

  const tenantsRes = await pool.query(`SELECT id, name FROM tenants ORDER BY name`);
  const report: any = { mode: APPLY ? 'APPLY' : 'REPORT-ONLY', tenants: [] };

  for (const tenant of tenantsRes.rows) {
    const t: any = {
      tenantId: tenant.id,
      tenantName: tenant.name,
      orphanStudentUsers: [] as any[],
      orphanParentUsers: [] as any[],
      missingStudentUsers: [] as any[],
      missingParentUsers: [] as any[],
      staleStudentIdRefs: [] as any[],
      identifierCollisions: [] as any[],
    };

    const students = (await pool.query(`SELECT * FROM students WHERE tenant_id = $1`, [tenant.id])).rows;
    const users = (await pool.query(`SELECT * FROM users WHERE tenant_id = $1`, [tenant.id])).rows;

    const studentIds = new Set(students.map((s) => s.id));
    const activeStudents = students.filter(
      (s) => s.is_active !== false && s.is_archived !== true
    );
    const activeStudentIds = new Set(activeStudents.map((s) => s.id));

    // ---- 1. orphan student users --------------------------------------
    for (const u of users.filter((x) => x.role === 'student')) {
      const linkedId = u.student_id || (u.id.startsWith('usr_') ? u.id.slice(4) : null);
      const natMatch = u.national_id && students.some((s) => s.national_id === u.national_id);
      const idMatch = linkedId && studentIds.has(linkedId);
      if (!idMatch && !natMatch) {
        t.orphanStudentUsers.push({ id: u.id, name: u.name, phone: u.phone });
      }
    }

    // ---- 2. orphan parent users ----------------------------------------
    for (const u of users.filter((x) => x.role === 'parent' && !x.staff_role)) {
      const ids: string[] = Array.isArray(u.student_ids) ? u.student_ids : [];
      const linkedActive = ids.filter((id) => activeStudentIds.has(id));
      const variants = phoneVariants(u.phone);
      const phoneChildren = activeStudents.filter(
        (s) => variants.includes(s.parent_phone) || variants.includes(s.mother_phone)
      );
      if (linkedActive.length === 0 && phoneChildren.length === 0) {
        t.orphanParentUsers.push({ id: u.id, name: u.name, phone: u.phone });
      }
    }

    // ---- 3 & 4. missing accounts ----------------------------------------
    for (const s of activeStudents) {
      const hasUser = users.some(
        (u) =>
          u.role === 'student' &&
          (u.student_id === s.id ||
            u.id === `usr_${s.id}` ||
            (s.national_id && u.national_id === s.national_id))
      );
      if (!hasUser) {
        t.missingStudentUsers.push({ studentId: s.id, name: s.full_name });
      }

      const gPhone = guardianPhoneOf(s);
      if (gPhone) {
        const variants = phoneVariants(gPhone);
        const hasParent = users.some(
          (u) => u.role === 'parent' && (variants.includes(u.phone) || variants.includes(u.login_identifier))
        );
        if (!hasParent) {
          t.missingParentUsers.push({ studentId: s.id, studentName: s.full_name, guardianPhone: gPhone });
        }
      }
    }

    // ---- 5. stale student_ids refs ---------------------------------------
    for (const u of users.filter((x) => x.role === 'parent')) {
      const ids: string[] = Array.isArray(u.student_ids) ? u.student_ids : [];
      const stale = ids.filter((id) => !studentIds.has(id));
      if (stale.length) {
        t.staleStudentIdRefs.push({ parentId: u.id, name: u.name, staleIds: stale });
      }
    }

    // ---- 6. identifier collisions ----------------------------------------
    const byIdent = new Map<string, any[]>();
    for (const u of users.filter((x) => x.is_active !== false && x.is_archived !== true)) {
      for (const v of phoneVariants(u.login_identifier || u.phone)) {
        const list = byIdent.get(v) || [];
        list.push(u);
        byIdent.set(v, list);
      }
    }
    for (const [ident, list] of byIdent) {
      const roles = new Set(list.map((u) => u.role));
      if (list.length > 1 && roles.size > 1) {
        t.identifierCollisions.push({
          identifier: ident,
          accounts: list.map((u) => ({ id: u.id, name: u.name, role: u.role })),
        });
      }
    }

    report.tenants.push(t);
  }

  // ---- print report ------------------------------------------------------
  for (const t of report.tenants) {
    const total =
      t.orphanStudentUsers.length + t.orphanParentUsers.length +
      t.missingStudentUsers.length + t.missingParentUsers.length +
      t.staleStudentIdRefs.length + t.identifierCollisions.length;
    console.log(`\n=== ${t.tenantName} (${t.tenantId}) — ${total} issue(s) ===`);
    const show = (label: string, arr: any[]) => {
      if (!arr.length) return;
      console.log(`  ${label}: ${arr.length}`);
      arr.forEach((x) => console.log(`    - ${JSON.stringify(x)}`));
    };
    show('Orphan student accounts (delete)', t.orphanStudentUsers);
    show('Orphan parent accounts (delete)', t.orphanParentUsers);
    show('Students missing login account (create)', t.missingStudentUsers);
    show('Guardians missing parent account (create)', t.missingParentUsers);
    show('Stale student_ids refs (clean)', t.staleStudentIdRefs);
    show('Identifier collisions (report only)', t.identifierCollisions);
  }

  // ---- apply -------------------------------------------------------------
  if (APPLY) {
    console.log('\n--- APPLYING FIXES ---');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const t of report.tenants) {
        for (const o of t.orphanStudentUsers) {
          await client.query(`DELETE FROM users WHERE id = $1 AND role = 'student'`, [o.id]);
          console.log(`deleted student user ${o.id} (${o.name})`);
        }
        for (const o of t.orphanParentUsers) {
          await client.query(
            `DELETE FROM users WHERE id = $1 AND role = 'parent' AND staff_role IS NULL`,
            [o.id]
          );
          console.log(`deleted parent user ${o.id} (${o.name})`);
        }
        for (const s of t.staleStudentIdRefs) {
          const row = (await client.query(`SELECT student_ids FROM users WHERE id = $1`, [s.parentId])).rows[0];
          const cleaned = (row?.student_ids || []).filter((id: string) => !s.staleIds.includes(id));
          await client.query(`UPDATE users SET student_ids = $2::jsonb, updated_at = NOW() WHERE id = $1`, [s.parentId, JSON.stringify(cleaned)]);
          console.log(`cleaned student_ids for ${s.parentId}`);
        }
      }
      // Missing accounts via the sync service (idempotent)
      for (const t of report.tenants) {
        if (!t.missingStudentUsers.length && !t.missingParentUsers.length) continue;
        const needIds = new Set([...t.missingStudentUsers.map((x: any) => x.studentId), ...t.missingParentUsers.map((x: any) => x.studentId)]);
        const rows = (await client.query(`SELECT * FROM students WHERE id = ANY($1)`, [Array.from(needIds)])).rows;
        for (const r of rows) {
          await syncStudentWrite(client, r, null);
          console.log(`provisioned accounts for student ${r.id} (${r.full_name})`);
        }
      }
      await client.query('COMMIT');
      console.log('--- APPLY COMPLETE ---');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('APPLY FAILED — rolled back:', e);
      process.exitCode = 1;
    } finally {
      client.release();
    }
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
