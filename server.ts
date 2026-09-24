import express from 'express';
import path from 'path';
import fs from 'fs';
import { createApp } from './server/app';
import { config } from './server/config/env';

async function startServer() {
  const app = createApp();
  const PORT = config.port || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const distIndexPath = path.join(distPath, 'index.html');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      if (fs.existsSync(distIndexPath)) {
        res.sendFile(distIndexPath);
      } else {
        res.status(404).send('App build not found. Please run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[QRMS Server] Running on http://0.0.0.0:${PORT} (Mode: ${isProd ? 'production' : 'dev-vite'})`);
    console.log(`[QRMS Server] Runtime Mode: ${config.apiRuntimeMode}`);
    console.log(`[QRMS Server] Remote API URL: ${config.devRemoteApiUrl}`);
  });
}

startServer().catch((err) => {
  console.error('[QRMS Server] Failed to start:', err);
  process.exit(1);
});
