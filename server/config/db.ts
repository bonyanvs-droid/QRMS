import pg from 'pg';
import { config } from './env';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDbPool(): pg.Pool | null {
  if (!config.databaseUrl) {
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: config.isProduction ? { rejectUnauthorized: false } : undefined,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err);
    });
  }
  return pool;
}

export interface DbHealthResult {
  connected: boolean;
  configured: boolean;
  latencyMs?: number;
  error?: string;
}

export async function checkDbHealth(): Promise<DbHealthResult> {
  const currentPool = getDbPool();
  if (!currentPool) {
    return {
      connected: false,
      configured: false,
      error: 'DATABASE_URL environment variable is not configured',
    };
  }

  const start = Date.now();
  try {
    const client = await currentPool.connect();
    try {
      await client.query('SELECT 1');
      const latencyMs = Date.now() - start;
      return {
        connected: true,
        configured: true,
        latencyMs,
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      connected: false,
      configured: true,
      error: err?.message || 'Failed to connect to PostgreSQL database',
    };
  }
}
