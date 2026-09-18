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
    const filters: { isArchived?: boolean; role?: string } = {};
    if (req.query.isArchived === 'true') filters.isArchived = true;
    else if (req.query.isArchived === 'false') filters.isArchived = false;
    if (typeof req.query.role === 'string' && req.query.role) filters.role = req.query.role;
    const users = await getUsersByTenant(tenantId, filters);
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
