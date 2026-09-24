import { executeQuery, executeQuerySingle } from '../db/query';
import { EducationalStage } from '../../src/types';

export async function getActiveStages(): Promise<EducationalStage[]> {
  const query = `
    SELECT *
    FROM stages
    WHERE is_active = TRUE
    ORDER BY display_order ASC, name ASC
  `;
  return executeQuery<EducationalStage>(query);
}

export async function getStageById(stageId: string): Promise<EducationalStage | null> {
  const query = `
    SELECT *
    FROM stages
    WHERE id = $1
    LIMIT 1
  `;
  return executeQuerySingle<EducationalStage>(query, [stageId]);
}
