import type { IncomingMessage, ServerResponse } from 'node:http';
import app from '../src/server/app.ts';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: IncomingMessage & { query?: Record<string, any> }, res: ServerResponse) {
  // Normalize req.url on Vercel so Express always sees /api/...
  const pathSegments = req.query?.path || req.query?.['...path'];
  if ((!req.url || !req.url.startsWith('/api')) && pathSegments) {
    const joined = Array.isArray(pathSegments) ? pathSegments.join('/') : String(pathSegments);
    req.url = `/api/${joined.replace(/^\/+/, '')}`;
  } else if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  return new Promise<void>((resolve) => {
    res.on('finish', resolve);
    res.on('close', resolve);
    app(req as any, res as any);
  });
}
