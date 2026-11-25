import type { IncomingMessage, ServerResponse } from 'node:http';
import app from '../src/server/app';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(
  req: IncomingMessage & { query?: Record<string, any> },
  res: ServerResponse
) {
  const parsedUrl = new URL(req.url || '/', 'http://localhost');
  const vercelPath =
    parsedUrl.searchParams.get('__vercel_path') ||
    (req.query?.__vercel_path ? String(req.query.__vercel_path) : null);

  if (vercelPath !== null) {
    parsedUrl.searchParams.delete('__vercel_path');
    const qs = parsedUrl.searchParams.toString();
    const cleanSubpath = vercelPath.replace(/^\/+/, '');
    req.url = cleanSubpath ? `/api/${cleanSubpath}${qs ? `?${qs}` : ''}` : `/api${qs ? `?${qs}` : ''}`;
  } else if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  return new Promise<void>((resolve) => {
    res.on('finish', resolve);
    res.on('close', resolve);
    app(req as any, res as any);
  });
}
