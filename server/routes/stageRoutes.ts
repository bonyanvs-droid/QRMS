import { Router } from 'express';
import { getActiveStages, getStageById } from '../services/stageService';

export const stageRouter = Router();

/**
 * GET /api/stages
 * Returns list of active educational stages.
 */
stageRouter.get('/', async (req, res, next) => {
  try {
    const stages = await getActiveStages();
    res.json({
      ok: true,
      count: stages.length,
      data: stages,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stages/:id
 * Returns details of a specific stage by ID.
 */
stageRouter.get('/:id', async (req, res, next) => {
  try {
    const stage = await getStageById(req.params.id);
    if (!stage) {
      res.status(404).json({
        ok: false,
        error: 'Educational stage not found',
      });
      return;
    }
    res.json({
      ok: true,
      data: stage,
    });
  } catch (err) {
    next(err);
  }
});
