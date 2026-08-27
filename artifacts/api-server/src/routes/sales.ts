import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sales, saleItems, products, debts, customers } from "@workspace/db/schema";
import { eq, desc, gte, sql } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";

import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middlewares/authMiddleware";
import { HttpError } from "../middlewares/errorHandler";

const router = Router();
router.use(requireAuth);

type SaleRow = typeof sales.$inferSelect;
type SaleItemRow = typeof saleItems.$inferSelect;

function mapSaleItem(si: SaleItemRow) {
  return {
    productId: si.productId,
    name: si.productName,
    qty: si.quantity,
    price: Number(si.unitPrice),
  };
}

function mapSale(sale: SaleRow, items: SaleItemRow[]) {
  return {
    id: sale.id,
    receiptNumber: sale.receiptNumber,
    total: Number(sale.total),
    method: sale.method,
    onCredit: sale.onCredit,
    customerId: sale.customerId,
    customerName: sale.customerName,
    mpesaRef: sale.mpesaRef,
    mpesaReceipt: sale.mpesaReceipt,
    servedById: sale.servedById,
    servedByName: sale.servedByName,
    items: items.map(mapSaleItem),
    createdAt: sale.createdAt,
  };
}

const saleItemSchema = z.object({
  productId: z.number().int().positive(),
  name: z.string().min(1),
  qty: z.number().int().positive(),
  price: z.number().nonnegative(),
});

const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "A sale must have at least one item"),
  total: z.number().nonnegative(),
  method: z.enum(["Cash", "M-PESA", "Credit"]),
  onCredit: z.boolean().default(false),
  customerId: z.number().int().positive().nullable().optional(),
  customerName: z.string().trim().nullable().optional(),
  mpesaRef: z.string().trim().nullable().optional(),
  mpesaReceipt: z.string().trim().nullable().optional(),
});

// GET /sales
router.get(
  "/sales",
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit ?? 50) || 50, 500);
    const offset = Number(req.query.offset ?? 0) || 0;
    const date = req.query.date as string | undefined;

    const rows = date
      ? await db
          .select()
          .from(sales)
          .where(sql`DATE(created_at) = ${date}`)
          .orderBy(desc(sales.createdAt))
          .limit(limit)
          .offset(offset)
      : await db.select().from(sales).orderBy(desc(sales.createdAt)).limit(limit).offset(offset);

    const result = await Promise.all(
      rows.map(async (sale) => {
        const items = await db.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
        return mapSale(sale, items);
      }),
    );
    res.json(result);
  }),
);

// GET /sales/stats
router.get(
  "/sales/stats",
  asyncHandler(async (_req: Request, res: Response) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [todayStats] = await db
      .select({
        revenue: sql<string>`COALESCE(SUM(total), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(sales)
      .where(gte(sales.createdAt, todayStart));

    const [monthStats] = await db
      .select({ revenue: sql<string>`COALESCE(SUM(total), 0)` })
      .from(sales)
      .where(gte(sales.createdAt, monthStart));

    const [debtStats] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(debts)
      .where(eq(debts.settled, false));

    const [lowStockStats] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(products)
      .where(sql`stock <= low_stock_threshold`);

    // Profit for today and this month, computed from sale_items joined to products
    // in a single query each (previously this ran one query per line item).
    const [todayProfitRow] = await db
      .select({
        profit: sql<string>`COALESCE(SUM((sale_items.unit_price - products.buying_price) * sale_items.quantity), 0)`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(gte(sales.createdAt, todayStart));

    const [monthProfitRow] = await db
      .select({
        profit: sql<string>`COALESCE(SUM((sale_items.unit_price - products.buying_price) * sale_items.quantity), 0)`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(gte(sales.createdAt, monthStart));

    res.json({
      todayRevenue: Number(todayStats?.revenue ?? 0),
      todayProfit: Number(todayProfitRow?.profit ?? 0),
      todaySalesCount: Number(todayStats?.count ?? 0),
      monthRevenue: Number(monthStats?.revenue ?? 0),
      monthProfit: Number(monthProfitRow?.profit ?? 0),
      totalOutstandingDebt: Number(debtStats?.total ?? 0),
      lowStockCount: Number(lowStockStats?.count ?? 0),
    });
  }),
);

// POST /sales — runs in a single DB transaction: creates the sale + items,
// decrements stock (failing the whole sale if any item is out of stock),
// and opens a debt record when sold on credit. Nothing is left half-done.
router.post(
  "/sales",
  asyncHandler(async (req: Request, res: Response) => {
    const body = createSaleSchema.parse(req.body);

    if (body.onCredit && !body.customerId) {
      throw new HttpError(400, "A customer must be selected for credit sales");
    }

    const receiptNumber = `RCP-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    const result = await db.transaction(async (tx) => {
      // Lock and validate stock for every line item before writing anything.
      for (const item of body.items) {
        const [product] = await tx
          .select()
          .from(products)
          .where(eq(products.id, item.productId))
          .for("update");
        if (!product) {
          throw new HttpError(404, `Product #${item.productId} was not found`);
        }
        if (product.stock < item.qty) {
          throw new HttpError(
            409,
            `Not enough stock for "${product.name}" — only ${product.stock} left`,
          );
        }
      }

      const [sale] = await tx
        .insert(sales)
        .values({
          receiptNumber,
          total: String(body.total),
          method: body.method,
          onCredit: body.onCredit,
          customerId: body.customerId ?? null,
          customerName: body.customerName ?? null,
          mpesaRef: body.mpesaRef ?? null,
          mpesaReceipt: body.mpesaReceipt ?? null,
          servedById: req.user?.id ?? null,
          servedByName: req.user ? `${req.user.firstName} ${req.user.lastName}`.trim() : null,
        })
        .returning();

      const itemRows: SaleItemRow[] = [];
      for (const item of body.items) {
        const [si] = await tx
          .insert(saleItems)
          .values({
            saleId: sale.id,
            productId: item.productId,
            productName: item.name,
            quantity: item.qty,
            unitPrice: String(item.price),
            subtotal: String(item.qty * item.price),
          })
          .returning();
        itemRows.push(si);
        await tx
          .update(products)
          .set({ stock: sql`stock - ${item.qty}`, updatedAt: new Date() })
          .where(eq(products.id, item.productId));
      }

      if (body.onCredit && body.customerId) {
        const [customer] = await tx
          .select()
          .from(customers)
          .where(eq(customers.id, body.customerId));
        if (!customer) throw new HttpError(404, "Customer not found");

        await tx.insert(debts).values({
          customerId: body.customerId,
          customerName: customer.name,
          amount: String(body.total),
          description: `Sale ${receiptNumber}`,
          saleId: sale.id,
        });
        await tx
          .update(customers)
          .set({ totalDebt: sql`total_debt + ${body.total}` })
          .where(eq(customers.id, body.customerId));
      }

      return { sale, itemRows };
    });

    res.status(201).json(mapSale(result.sale, result.itemRows));
  }),
);

// GET /sales/:id
router.get(
  "/sales/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    if (!sale) throw new HttpError(404, "Not found");
    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id));
    res.json(mapSale(sale, items));
  }),
);

export default router;