import { spawn } from 'node:child_process';
import path from 'path';
import fs from 'fs';

// If started directly via `node server.ts` without TypeScript loader support,
// re-execute with `--import tsx` so all extensionless internal TypeScript imports resolve properly.
if (!process.env.TSX_ACTIVE && !process.execArgv.some((arg) => arg.includes('tsx'))) {
  const child = spawn(process.execPath, ['--import', 'tsx', ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, TSX_ACTIVE: 'true' },
  });
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
} else {
  runApp().catch((err) => {
    console.error('[QRMS Server] Failed to start:', err);
    process.exit(1);
  });
}

async function runApp() {
  const express = (await import('express')).default;
  const { createApp } = await import('./server/app');
  const { config } = await import('./server/config/env');

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

