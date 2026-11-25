import type { IncomingMessage, ServerResponse } from 'node:http';
import app from '../src/server/app.js';

export default function handler(
  req: IncomingMessage & { query?: Record<string, any> },
  res: ServerResponse
) {
  return new Promise<void>((resolve) => {
    const finish = () => resolve();
    res.on('finish', finish);
    res.on('close', finish);

    try {
      const parsedUrl = new URL(req.url || '/', 'http://localhost');
      const vercelPath =
        parsedUrl.searchParams.get('__vercel_path') ||
        (req.query?.__vercel_path ? String(req.query.__vercel_path) : null);

      if (vercelPath !== null) {
        parsedUrl.searchParams.delete('__vercel_path');
        const qs = parsedUrl.searchParams.toString();
        const cleanSubpath = vercelPath.replace(/^\/+/, '');
        req.url = cleanSubpath
          ? `/api/${cleanSubpath}${qs ? `?${qs}` : ''}`
          : `/api${qs ? `?${qs}` : ''}`;
      } else if (req.url && !req.url.startsWith('/api')) {
        req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
      }

      app(req as any, res as any);
    } catch (err: any) {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(
          JSON.stringify({
            error: err?.message || 'Terjadi kesalahan saat memproses permintaan API.',
          })
        );
      }
      resolve();
    }
  });
}
