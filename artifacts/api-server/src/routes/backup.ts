import {
  customers,
  db,
  debts,
  mpesaTransactions,
  products,
  saleItems,
  sales,
  shopSettings,
} from '@workspace/db';
import { sql } from 'drizzle-orm';
import { Router, type IRouter, type Request, type Response } from 'express';
import { z } from 'zod';

import { asyncHandler } from '../lib/asyncHandler';
import { requireAdmin } from '../middlewares/authMiddleware';

const router: IRouter = Router();

// GET /backup/export — a full JSON snapshot of all business data (not users/
// passwords). Works regardless of whether the app runs on the desktop's
// embedded Postgres or a hosted one, so it's the portable backup format.
// The desktop app additionally offers a raw file-level backup of the
// database directory via the Electron "Backup Database" menu action.
router.get(
  '/backup/export',
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const [settings, productRows, customerRows, saleRows, saleItemRows, debtRows, mpesaRows] =
      await Promise.all([
        db.select().from(shopSettings),
        db.select().from(products),
        db.select().from(customers),
        db.select().from(sales),
        db.select().from(saleItems),
        db.select().from(debts),
        db.select().from(mpesaTransactions),
      ]);

    res.setHeader('Content-Disposition', `attachment; filename="biashara-backup-${Date.now()}.json"`);
    res.json({
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        shopSettings: settings,
        products: productRows,
        customers: customerRows,
        sales: saleRows,
        saleItems: saleItemRows,
        debts: debtRows,
        mpesaTransactions: mpesaRows,
      },
    });
  }),
);

const importSchema = z.object({
  confirm: z.literal(true),
  data: z.object({
    shopSettings: z.array(z.record(z.string(), z.unknown())),
    products: z.array(z.record(z.string(), z.unknown())),
    customers: z.array(z.record(z.string(), z.unknown())),
    sales: z.array(z.record(z.string(), z.unknown())),
    saleItems: z.array(z.record(z.string(), z.unknown())),
    debts: z.array(z.record(z.string(), z.unknown())),
    mpesaTransactions: z.array(z.record(z.string(), z.unknown())),
  }),
});

// POST /backup/import — REPLACES all business data with the contents of a
// previously exported JSON backup. Requires `{ confirm: true }` to avoid
// accidental data loss. User accounts are left untouched.
router.post(
  '/backup/import',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { data } = importSchema.parse(req.body);

    await db.transaction(async (tx) => {
      // Delete in dependency order, then re-insert.
      await tx.execute(sql`TRUNCATE TABLE mpesa_transactions, sale_items, sales, debts, customers, products RESTART IDENTITY CASCADE`);

      if (data.products.length) await tx.insert(products).values(data.products as never);
      if (data.customers.length) await tx.insert(customers).values(data.customers as never);
      if (data.sales.length) await tx.insert(sales).values(data.sales as never);
      if (data.saleItems.length) await tx.insert(saleItems).values(data.saleItems as never);
      if (data.debts.length) await tx.insert(debts).values(data.debts as never);
      if (data.mpesaTransactions.length)
        await tx.insert(mpesaTransactions).values(data.mpesaTransactions as never);
      if (data.shopSettings.length) {
        await tx
          .insert(shopSettings)
          .values(data.shopSettings[0] as never)
          .onConflictDoUpdate({
            target: shopSettings.id,
            set: data.shopSettings[0] as never,
          });
      }
    });

    res.json({ success: true });
  }),
);

export default router;
