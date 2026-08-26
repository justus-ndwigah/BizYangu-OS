import { db, usersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { Router, type IRouter, type Request, type Response } from 'express';
import { z } from 'zod';

import { asyncHandler } from '../lib/asyncHandler';
import { hashPassword, toPublicUser } from '../lib/auth';
import { requireAdmin } from '../middlewares/authMiddleware';
import { HttpError } from '../middlewares/errorHandler';

const router: IRouter = Router();

const createUserSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'cashier']).default('cashier'),
});

const updateUserSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  role: z.enum(['admin', 'cashier']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

// All user-management routes are admin-only.
router.use(requireAdmin);

// GET /users
router.get(
  '/users',
  asyncHandler(async (_req: Request, res: Response) => {
    const rows = await db.select().from(usersTable).orderBy(usersTable.createdAt);
    res.json(rows.map(toPublicUser));
  }),
);

// POST /users — admin creates a staff account (e.g. a cashier).
router.post(
  '/users',
  asyncHandler(async (req: Request, res: Response) => {
    const body = createUserSchema.parse(req.body);
    const passwordHash = await hashPassword(body.password);
    const [user] = await db
      .insert(usersTable)
      .values({
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        passwordHash,
        role: body.role,
      })
      .returning();
    res.status(201).json(toPublicUser(user));
  }),
);

// PATCH /users/:id
router.patch(
  '/users/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const body = updateUserSchema.parse(req.body);

    if (id === req.user!.id && body.isActive === false) {
      throw new HttpError(400, "You can't deactivate your own account.");
    }
    if (id === req.user!.id && body.role && body.role !== 'admin') {
      throw new HttpError(400, "You can't remove your own admin access.");
    }

    const updates: Partial<typeof usersTable.$inferInsert> = {};
    if (body.firstName !== undefined) updates.firstName = body.firstName;
    if (body.lastName !== undefined) updates.lastName = body.lastName;
    if (body.role !== undefined) updates.role = body.role;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.password !== undefined) updates.passwordHash = await hashPassword(body.password);

    const [row] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
    if (!row) throw new HttpError(404, 'User not found');
    res.json(toPublicUser(row));
  }),
);

// DELETE /users/:id — deactivates rather than hard-deletes, to preserve sale history integrity.
router.delete(
  '/users/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    if (id === req.user!.id) {
      throw new HttpError(400, "You can't remove your own account.");
    }
    const [row] = await db
      .update(usersTable)
      .set({ isActive: false })
      .where(eq(usersTable.id, id))
      .returning();
    if (!row) throw new HttpError(404, 'User not found');
    res.status(204).send();
  }),
);

export default router;
