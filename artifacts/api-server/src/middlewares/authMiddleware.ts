import { type NextFunction, type Request, type Response } from 'express';
import type { PublicUser } from '@workspace/db';

import { clearSession, getSession, getSessionId, getUserById, toPublicUser } from '../lib/auth';

declare global {
  namespace Express {
    interface User extends PublicUser {}

    interface Request {
      isAuthenticated(): this is Express.AuthedRequest;
      user?: User | undefined;
    }

    interface AuthedRequest {
      user: User;
    }
  }
}

// Populates req.user from the session cookie/bearer token, if valid.
// Does NOT block unauthenticated requests — use `requireAuth` for that.
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request['isAuthenticated'];

  const sid = getSessionId(req);
  if (!sid) {
    next();
    return;
  }

  const session = await getSession(sid);
  if (!session?.userId) {
    await clearSession(res, sid);
    next();
    return;
  }

  const user = await getUserById(session.userId);
  if (!user || !user.isActive) {
    await clearSession(res, sid);
    next();
    return;
  }

  req.user = toPublicUser(user);
  next();
}

// Blocks the request unless the session resolved to an active user.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  next();
}

// Blocks the request unless the authenticated user is an admin.
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
