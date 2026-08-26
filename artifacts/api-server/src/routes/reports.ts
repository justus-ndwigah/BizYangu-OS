import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sales, saleItems, products } from "@workspace/db/schema";
import { eq, gte, sql, desc } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middlewares/authMiddleware";

const router = Router();
router.use(requireAuth);

// GET /reports/daily?days=14
router.get(
  "/reports/daily",
  asyncHandler(async (req: Request, res: Response) => {
    const days = Math.min(Number(req.query.days ?? 14) || 14, 365);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);

    const revenueRows = await db
      .select({
        date: sql<string>`DATE(sales.created_at)`,
        revenue: sql<string>`COALESCE(SUM(sales.total), 0)`,
        salesCount: sql<number>`COUNT(DISTINCT sales.id)`,
      })
      .from(sales)
      .where(gte(sales.createdAt, cutoff))
      .groupBy(sql`DATE(sales.created_at)`)
      .orderBy(sql`DATE(sales.created_at)`);

    const profitRows = await db
      .select({
        date: sql<string>`DATE(sales.created_at)`,
        profit: sql<string>`COALESCE(SUM((sale_items.unit_price - products.buying_price) * sale_items.quantity), 0)`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(gte(sales.createdAt, cutoff))
      .groupBy(sql`DATE(sales.created_at)`);

    const profitByDate = new Map(profitRows.map((r) => [r.date, Number(r.profit)]));

    res.json(
      revenueRows.map((r) => ({
        date: r.date,
        revenue: Number(r.revenue),
        salesCount: Number(r.salesCount),
        profit: profitByDate.get(r.date) ?? 0,
      })),
    );
  }),
);

// GET /reports/top-products?limit=5
router.get(
  "/reports/top-products",
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit ?? 5) || 5, 50);

    const rows = await db
      .select({
        productId: saleItems.productId,
        productName: saleItems.productName,
        unitsSold: sql<number>`SUM(quantity)`,
        revenue: sql<string>`SUM(subtotal)`,
      })
      .from(saleItems)
      .groupBy(saleItems.productId, saleItems.productName)
      .orderBy(desc(sql`SUM(quantity)`))
      .limit(limit);

    res.json(
      rows.map((r) => ({
        productId: r.productId,
        productName: r.productName,
        unitsSold: Number(r.unitsSold),
        revenue: Number(r.revenue),
      })),
    );
  }),
);

// GET /reports/category-breakdown
router.get(
  "/reports/category-breakdown",
  asyncHandler(async (_req: Request, res: Response) => {
    const rows = await db
      .select({
        category: products.category,
        revenue: sql<string>`SUM(sale_items.subtotal)`,
        unitsSold: sql<number>`SUM(sale_items.quantity)`,
      })
      .from(saleItems)
      .innerJoin(products, eq(saleItems.productId, products.id))
      .groupBy(products.category)
      .orderBy(desc(sql`SUM(sale_items.subtotal)`));

    res.json(
      rows.map((r) => ({
        category: r.category,
        revenue: Number(r.revenue),
        unitsSold: Number(r.unitsSold),
      })),
    );
  }),
);

export default router;
