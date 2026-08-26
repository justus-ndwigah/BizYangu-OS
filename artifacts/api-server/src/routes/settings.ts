import { db, shopSettings } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { Router, type IRouter, type Request, type Response } from 'express';
import { z } from 'zod';

import { asyncHandler } from '../lib/asyncHandler';
import { requireAdmin, requireAuth } from '../middlewares/authMiddleware';
import { HttpError } from '../middlewares/errorHandler';

const router: IRouter = Router();

const updateSchema = z.object({
  shopName: z.string().trim().min(1).optional(),
  ownerName: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  currency: z.string().trim().min(1).optional(),
  receiptFooter: z.string().trim().nullable().optional(),
  defaultLowStockThreshold: z.number().int().min(0).optional(),
  mpesaShortcode: z.string().trim().nullable().optional(),
});

// GET /settings — any authenticated user can read shop info (needed for receipts/UI).
router.get(
  '/settings',
  requireAuth,
  asyncHandler(async (_req: Request, res: Response) => {
    const [row] = await db.select().from(shopSettings).where(eq(shopSettings.id, 1));
    if (!row) throw new HttpError(404, 'Shop has not been set up yet');
    res.json(row);
  }),
);

// PATCH /settings — admin only.
router.patch(
  '/settings',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const body = updateSchema.parse(req.body);
    const [row] = await db
      .update(shopSettings)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(shopSettings.id, 1))
      .returning();
    if (!row) throw new HttpError(404, 'Shop has not been set up yet');
    res.json(row);
  }),
);

export default router;
