import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import app from './src/server/app.js';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);

/**
 * Standalone Node server launcher:
 * - Development: mounts Vite middleware for non-/api requests on port 3000 (0.0.0.0)
 * - Production (e.g. Cloud Run via `npm run start`): serves static /dist assets + /api/* on 0.0.0.0:3000
 * - Vercel production: uses /api/[...path].ts + /dist directly without executing this file
 */
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use((req, res, next) => {
      if (req.path === '/api' || req.path.startsWith('/api/')) {
        return next();
      }
      return vite.middlewares(req, res, next);
    });
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 FinSight Server running at http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
