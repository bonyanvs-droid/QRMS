import { getDbPool } from '../config/db';
import { snakeToCamelCase } from '../../src/db/schema';

export async function executeQuery<T = any>(
  text: string,
  params: any[] = []
): Promise<T[]> {
  const pool = getDbPool();
  if (!pool) {
    throw new Error('Database is not connected. Please set DATABASE_URL.');
  }

  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res.rows.map((row) => snakeToCamelCase<T>(row));
  } finally {
    client.release();
  }
}

export async function executeQuerySingle<T = any>(
  text: string,
  params: any[] = []
): Promise<T | null> {
  const rows = await executeQuery<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}
