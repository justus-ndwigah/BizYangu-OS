import { db, shopSettings, usersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { Router, type IRouter, type Request, type Response } from 'express';
import { z } from 'zod';

import { asyncHandler } from '../lib/asyncHandler';
import {
  clearSession,
  countUsers,
  createSession,
  deleteSession,
  getSessionId,
  getUserByEmail,
  hashPassword,
  setSessionCookie,
  toPublicUser,
  verifyPassword,
} from '../lib/auth';
import { HttpError } from '../middlewares/errorHandler';
import { requireAuth } from '../middlewares/authMiddleware';

const router: IRouter = Router();

const emailSchema = z.string().trim().toLowerCase().email();
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

const setupSchema = z.object({
  shopName: z.string().trim().min(1),
  ownerName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  currency: z.string().trim().min(1).default('KES'),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: emailSchema,
  password: passwordSchema,
});

// GET /auth/setup-status — whether the first-run wizard still needs to run.
router.get(
  '/auth/setup-status',
  asyncHandler(async (_req: Request, res: Response) => {
    const total = await countUsers();
    res.json({ needsSetup: total === 0 });
  }),
);

// POST /auth/setup — one-time: create the shop profile + first admin user.
// Refuses to run again once any user exists, so it can't be used to bypass auth later.
router.post(
  '/auth/setup',
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await countUsers();
    if (existing > 0) {
      throw new HttpError(409, 'Setup has already been completed.');
    }

    const body = setupSchema.parse(req.body);
    const passwordHash = await hashPassword(body.password);

    const [user] = await db
      .insert(usersTable)
      .values({
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        passwordHash,
        role: 'admin',
      })
      .returning();

    await db
      .insert(shopSettings)
      .values({
        id: 1,
        shopName: body.shopName,
        ownerName: body.ownerName ?? null,
        phone: body.phone ?? null,
        address: body.address ?? null,
        currency: body.currency,
        setupComplete: true,
      })
      .onConflictDoUpdate({
        target: shopSettings.id,
        set: {
          shopName: body.shopName,
          ownerName: body.ownerName ?? null,
          phone: body.phone ?? null,
          address: body.address ?? null,
          currency: body.currency,
          setupComplete: true,
          updatedAt: new Date(),
        },
      });

    const sid = await createSession(user.id);
    setSessionCookie(res, sid);
    res.status(201).json({ user: toPublicUser(user) });
  }),
);

// POST /auth/login
router.post(
  '/auth/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await getUserByEmail(email);
    if (!user || !user.isActive) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const sid = await createSession(user.id);
    setSessionCookie(res, sid);
    res.json({ user: toPublicUser(user) });
  }),
);

// POST /auth/logout
router.post(
  '/auth/logout',
  asyncHandler(async (req: Request, res: Response) => {
    const sid = getSessionId(req);
    await clearSession(res, sid);
    res.json({ success: true });
  }),
);

// GET /auth/user — the currently authenticated user, or null.
router.get('/auth/user', (req: Request, res: Response) => {
  res.json({ user: req.isAuthenticated() ? req.user : null });
});

// POST /auth/change-password — any logged-in user can change their own password.
router.post(
  '/auth/change-password',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: passwordSchema,
    });
    const { currentPassword, newPassword } = schema.parse(req.body);

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
    if (!user) throw new HttpError(404, 'User not found');

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw new HttpError(401, 'Current password is incorrect');

    const passwordHash = await hashPassword(newPassword);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));

    // Invalidate the current session too, forcing a clean re-login on other devices.
    const sid = getSessionId(req);
    await deleteSession(sid!);
    await clearSession(res);
    res.json({ success: true });
  }),
);

export default router;
