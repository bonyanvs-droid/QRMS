import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApp } from './server/app';
import { config } from './server/config/env';

async function startServer() {
  const app = createApp();
  const PORT = config.port || 3000;

  // Vite middleware for development vs static serve for production
  if (config.nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[QRMS Server] Running on http://0.0.0.0:${PORT} in ${config.nodeEnv} mode`);
  });
}

startServer().catch((err) => {
  console.error('[QRMS Server] Failed to start:', err);
  process.exit(1);
});
