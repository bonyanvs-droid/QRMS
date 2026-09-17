import { Router } from 'express';
import { getUsersByTenant, getUserById } from '../services/userService';
import { requireTenantContext } from '../middleware/tenantContext';

export const userRouter = Router();

/**
 * GET /api/users
 * Returns users belonging to the active tenant scope (requires tenant context).
 */
userRouter.get('/', requireTenantContext, async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const users = await getUsersByTenant(tenantId);
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
