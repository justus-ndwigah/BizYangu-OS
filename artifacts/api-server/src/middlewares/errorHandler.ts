import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Centralized error handler — every route funnels unexpected errors here via
// asyncHandler, so a single bug can never crash the whole server or leak
// stack traces to shop owners.
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (res.headersSent) return;

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  const pgError = err as { code?: string; constraint?: string };
  if (pgError?.code === '23505') {
    res.status(409).json({ error: 'A record with this value already exists.' });
    return;
  }
  if (pgError?.code === '23503') {
    res
      .status(409)
      .json({ error: 'This record is linked to other data (e.g. past sales) and cannot be deleted.' });
    return;
  }

  req.log?.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `No route: ${req.method} ${req.path}` });
}
