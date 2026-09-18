import express from 'express';
import path from 'path';
import { createApp } from './server/app';
import { config } from './server/config/env';

async function startServer() {
  const app = createApp();
  const PORT = 3000;

  const distPath = path.join(process.cwd(), 'dist');

  // Serve static production build to eliminate 429 individual module fetch errors in Preview
  app.use(express.static(distPath));
  app.get('*all', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[QRMS Server] Running on http://0.0.0.0:${PORT} (Production Static Mode)`);
    console.log(`[QRMS Server] Runtime Mode: ${config.apiRuntimeMode}`);
    console.log(`[QRMS Server] Remote API URL: ${config.devRemoteApiUrl}`);
  });
}

startServer().catch((err) => {
  console.error('[QRMS Server] Failed to start:', err);
  process.exit(1);
});
