import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { debts, customers } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middlewares/authMiddleware";
import { HttpError } from "../middlewares/errorHandler";

const router = Router();
router.use(requireAuth);

type DebtRow = typeof debts.$inferSelect;

function mapDebt(d: DebtRow) {
  return {
    id: d.id,
    customerId: d.customerId,
    customerName: d.customerName,
    amount: Number(d.amount),
    note: d.description ?? null,
    settled: d.settled,
    settledAt: d.settledAt?.toISOString() ?? null,
    createdAt: d.createdAt,
  };
}

const createDebtSchema = z.object({
  amount: z.number().positive(),
  note: z.string().trim().nullable().optional(),
});

// GET /customers/:id/debts
router.get(
  "/customers/:id/debts",
  asyncHandler(async (req: Request, res: Response) => {
    const customerId = Number(req.params.id);
    const rows = await db.select().from(debts).where(eq(debts.customerId, customerId)).orderBy(debts.createdAt);
    res.json(rows.map(mapDebt));
  }),
);

// POST /customers/:id/debts — manually record a debt not tied to a sale.
router.post(
  "/customers/:id/debts",
  asyncHandler(async (req: Request, res: Response) => {
    const customerId = Number(req.params.id);
    const body = createDebtSchema.parse(req.body);

    const debt = await db.transaction(async (tx) => {
      const [customer] = await tx.select().from(customers).where(eq(customers.id, customerId));
      if (!customer) throw new HttpError(404, "Customer not found");

      const [newDebt] = await tx
        .insert(debts)
        .values({
          customerId,
          customerName: customer.name,
          amount: String(body.amount),
          description: body.note ?? null,
        })
        .returning();

      await tx
        .update(customers)
        .set({ totalDebt: sql`total_debt + ${body.amount}` })
        .where(eq(customers.id, customerId));

      return newDebt;
    });

    res.status(201).json(mapDebt(debt));
  }),
);

// POST /debts/:id/settle
router.post(
  "/debts/:id/settle",
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const updated = await db.transaction(async (tx) => {
      const [debt] = await tx.select().from(debts).where(eq(debts.id, id));
      if (!debt) throw new HttpError(404, "Debt not found");
      if (debt.settled) throw new HttpError(400, "Already settled");

      const [row] = await tx
        .update(debts)
        .set({ settled: true, settledAt: new Date() })
        .where(eq(debts.id, id))
        .returning();

      await tx
        .update(customers)
        .set({ totalDebt: sql`GREATEST(total_debt - ${debt.amount}, 0)` })
        .where(eq(customers.id, debt.customerId));

      return row;
    });

    res.json(mapDebt(updated));
  }),
);

// DELETE /debts/:id — only unsettled debts may be removed (e.g. entered in error).
router.delete(
  "/debts/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    await db.transaction(async (tx) => {
      const [debt] = await tx
        .select()
        .from(debts)
        .where(and(eq(debts.id, id), eq(debts.settled, false)));
      if (!debt) throw new HttpError(404, "Unsettled debt not found");

      await tx.delete(debts).where(eq(debts.id, id));
      await tx
        .update(customers)
        .set({ totalDebt: sql`GREATEST(total_debt - ${debt.amount}, 0)` })
        .where(eq(customers.id, debt.customerId));
    });

    res.status(204).send();
  }),
);

// GET /debts/summary
router.get(
  "/debts/summary",
  asyncHandler(async (_req: Request, res: Response) => {
    const [summary] = await db
      .select({
        totalOutstanding: sql<string>`COALESCE(SUM(amount), 0)`,
        debtorCount: sql<number>`COUNT(DISTINCT customer_id)`,
        unsettledCount: sql<number>`COUNT(*)`,
      })
      .from(debts)
      .where(eq(debts.settled, false));

    res.json({
      totalOutstanding: Number(summary?.totalOutstanding ?? 0),
      debtorCount: Number(summary?.debtorCount ?? 0),
      unsettledCount: Number(summary?.unsettledCount ?? 0),
    });
  }),
);

export default router;
