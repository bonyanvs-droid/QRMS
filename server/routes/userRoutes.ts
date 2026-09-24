import { Router } from 'express';
import { getUsersByTenant, getUserById } from '../services/userService';
import { requireTenantContext } from '../middleware/tenantContext';
import { upsert, deleteRecord, bulkUpsert } from '../services/entityService';

export const userRouter = Router();

/**
 * GET /api/users
 * Returns users belonging to the active tenant scope (requires tenant context).
 */
userRouter.get('/', requireTenantContext, async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;

    // Cross-tenant attempt by an authenticated non-privileged session — no data.
    if (req.tenantScopeViolation) {
      res.json({ ok: true, tenantId, count: 0, data: [] });
      return;
    }

    const filters: { isArchived?: boolean; role?: string } = {};
    if (req.query.isArchived === 'true') filters.isArchived = true;
    else if (req.query.isArchived === 'false') filters.isArchived = false;
    if (typeof req.query.role === 'string' && req.query.role) filters.role = req.query.role;
    let users = await getUsersByTenant(tenantId, filters);

    // Parent/student sessions may only resolve their own user record.
    const suRole = req.sessionUser?.role;
    if (suRole === 'parent' || suRole === 'student') {
      users = users.filter((u: any) => u.id === req.sessionUser.id);
    }

    res.json({
      ok: true,
      tenantId,
      count: users.length,
      data: users,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users/:id
 * Returns a specific user within the tenant scope.
 */
userRouter.get('/:id', async (req, res, next) => {
  try {
    if (req.tenantScopeViolation) {
      res.status(404).json({ ok: false, error: 'User not found in the specified context' });
      return;
    }
    const suRole = req.sessionUser?.role;
    if ((suRole === 'parent' || suRole === 'student') && req.sessionUser.id !== req.params.id) {
      res.status(404).json({ ok: false, error: 'User not found in the specified context' });
      return;
    }
    const user = await getUserById(req.params.id, req.tenantId);
    if (!user) {
      res.status(404).json({
        ok: false,
        error: 'User not found in the specified context',
      });
      return;
    }
    res.json({
      ok: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/users
 * Saves or updates a user
 */
userRouter.post('/', async (req, res, next) => {
  try {
    if (req.tenantScopeViolation) {
      res.status(403).json({ ok: false, error: 'Tenant scope violation: request rejected.' });
      return;
    }
    if (req.sessionUser?.role === 'parent' || req.sessionUser?.role === 'student') {
      res.status(403).json({ ok: false, error: 'This role does not have write access.' });
      return;
    }
    const saved = await upsert('users', req.body, req.tenantId);
    res.json({
      ok: true,
      data: saved,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/users/bulk
 * Saves multiple users
 */
userRouter.post('/bulk', async (req, res, next) => {
  try {
    if (req.tenantScopeViolation) {
      res.status(403).json({ ok: false, error: 'Tenant scope violation: request rejected.' });
      return;
    }
    if (req.sessionUser?.role === 'parent' || req.sessionUser?.role === 'student') {
      res.status(403).json({ ok: false, error: 'This role does not have write access.' });
      return;
    }
    const items = req.body.items || req.body.records || (Array.isArray(req.body) ? req.body : []);
    const result = await bulkUpsert('users', items, req.tenantId);
    res.json({
      ok: true,
      count: result.count,
      data: result.items,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/users/:id
 * Deletes a user
 */
userRouter.delete('/:id', async (req, res, next) => {
  try {
    if (req.tenantScopeViolation) {
      res.status(403).json({ ok: false, error: 'Tenant scope violation: request rejected.' });
      return;
    }
    if (req.sessionUser?.role === 'parent' || req.sessionUser?.role === 'student') {
      res.status(403).json({ ok: false, error: 'This role does not have write access.' });
      return;
    }
    const deleted = await deleteRecord('users', req.params.id, req.tenantId);
    if (!deleted) {
      res.status(404).json({
        ok: false,
        error: 'User not found or could not be deleted',
      });
      return;
    }
    res.json({
      ok: true,
      message: `User ${req.params.id} deleted successfully`,
    });
  } catch (err) {
    next(err);
  }
});
