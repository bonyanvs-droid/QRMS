import { checkDbHealth } from '../config/db';

export async function getSystemHealth() {
  const dbHealth = await checkDbHealth();

  return {
    ok: dbHealth.connected,
    service: 'qrms-api',
    timestamp: new Date().toISOString(),
    database: {
      status: dbHealth.connected ? 'connected' : (dbHealth.configured ? 'disconnected' : 'unconfigured'),
      configured: dbHealth.configured,
      latencyMs: dbHealth.latencyMs,
      error: dbHealth.error,
    },
  };
}
