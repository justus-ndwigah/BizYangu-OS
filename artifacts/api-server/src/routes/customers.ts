import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { customers } from "@workspace/db/schema";
import { eq, ilike } from "drizzle-orm";
import { z } from "zod";

import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middlewares/authMiddleware";
import { HttpError } from "../middlewares/errorHandler";

const router = Router();
router.use(requireAuth);

const createCustomerSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().nullable().optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

// GET /customers
router.get(
  "/customers",
  asyncHandler(async (req: Request, res: Response) => {
    const search = req.query.search as string | undefined;
    const rows = search
      ? await db.select().from(customers).where(ilike(customers.name, `%${search}%`)).orderBy(customers.name)
      : await db.select().from(customers).orderBy(customers.name);
    res.json(
      rows.map((r) => ({ ...r, totalDebt: Number(r.totalDebt) })),
    );
  }),
);

// POST /customers
router.post(
  "/customers",
  asyncHandler(async (req: Request, res: Response) => {
    const body = createCustomerSchema.parse(req.body);
    const [row] = await db
      .insert(customers)
      .values({ name: body.name, phone: body.phone ?? null })
      .returning();
    res.status(201).json({ ...row, totalDebt: Number(row.totalDebt) });
  }),
);

// GET /customers/:id
router.get(
  "/customers/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const [row] = await db.select().from(customers).where(eq(customers.id, id));
    if (!row) throw new HttpError(404, "Not found");
    res.json({ ...row, totalDebt: Number(row.totalDebt) });
  }),
);

// PATCH /customers/:id
router.patch(
  "/customers/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const body = updateCustomerSchema.parse(req.body);
    const updates: Partial<typeof customers.$inferInsert> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.phone !== undefined) updates.phone = body.phone;

    const [row] = await db.update(customers).set(updates).where(eq(customers.id, id)).returning();
    if (!row) throw new HttpError(404, "Not found");
    res.json({ ...row, totalDebt: Number(row.totalDebt) });
  }),
);

// DELETE /customers/:id
router.delete(
  "/customers/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const [row] = await db.delete(customers).where(eq(customers.id, id)).returning();
    if (!row) throw new HttpError(404, "Not found");
    res.status(204).send();
  }),
);

export default router;
