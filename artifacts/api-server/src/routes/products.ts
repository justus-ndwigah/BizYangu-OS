import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { products } from "@workspace/db/schema";
import { eq, lte } from "drizzle-orm";
import { z } from "zod";

import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middlewares/authMiddleware";
import { HttpError } from "../middlewares/errorHandler";

const router = Router();
router.use(requireAuth);

type ProductRow = typeof products.$inferSelect;

function mapProduct(p: ProductRow) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    barcode: p.sku ?? null,
    buyPrice: Number(p.buyingPrice),
    sellPrice: Number(p.sellingPrice),
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold,
    unit: p.unit,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

const createProductSchema = z.object({
  name: z.string().trim().min(1),
  barcode: z.string().trim().nullable().optional(),
  category: z.string().trim().min(1).default("General"),
  buyPrice: z.number().nonnegative().default(0),
  sellPrice: z.number().nonnegative(),
  stock: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(5),
  unit: z.string().trim().min(1).default("pcs"),
});

const updateProductSchema = createProductSchema.partial();

// GET /products
router.get(
  "/products",
  asyncHandler(async (_req: Request, res: Response) => {
    const rows = await db.select().from(products).orderBy(products.name);
    res.json(rows.map(mapProduct));
  }),
);

// POST /products
router.post(
  "/products",
  asyncHandler(async (req: Request, res: Response) => {
    const body = createProductSchema.parse(req.body);
    if (body.sellPrice < body.buyPrice) {
      throw new HttpError(400, "Selling price is lower than the buying price — is that intended?");
    }
    const [row] = await db
      .insert(products)
      .values({
        name: body.name,
        sku: body.barcode ?? null,
        category: body.category,
        buyingPrice: String(body.buyPrice),
        sellingPrice: String(body.sellPrice),
        stock: body.stock,
        lowStockThreshold: body.lowStockThreshold,
        unit: body.unit,
      })
      .returning();
    res.status(201).json(mapProduct(row));
  }),
);

// GET /products/low-stock
router.get(
  "/products/low-stock",
  asyncHandler(async (_req: Request, res: Response) => {
    const rows = await db
      .select()
      .from(products)
      .where(lte(products.stock, products.lowStockThreshold))
      .orderBy(products.stock);
    res.json(rows.map(mapProduct));
  }),
);

// GET /products/:id
router.get(
  "/products/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const [row] = await db.select().from(products).where(eq(products.id, id));
    if (!row) throw new HttpError(404, "Not found");
    res.json(mapProduct(row));
  }),
);

// PATCH /products/:id
router.patch(
  "/products/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const body = updateProductSchema.parse(req.body);
    const updates: Partial<typeof products.$inferInsert> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.barcode !== undefined) updates.sku = body.barcode;
    if (body.category !== undefined) updates.category = body.category;
    if (body.buyPrice !== undefined) updates.buyingPrice = String(body.buyPrice);
    if (body.sellPrice !== undefined) updates.sellingPrice = String(body.sellPrice);
    if (body.stock !== undefined) updates.stock = body.stock;
    if (body.lowStockThreshold !== undefined) updates.lowStockThreshold = body.lowStockThreshold;
    if (body.unit !== undefined) updates.unit = body.unit;
    updates.updatedAt = new Date();

    const [row] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    if (!row) throw new HttpError(404, "Not found");
    res.json(mapProduct(row));
  }),
);

// DELETE /products/:id
router.delete(
  "/products/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const [row] = await db.delete(products).where(eq(products.id, id)).returning();
    if (!row) throw new HttpError(404, "Not found");
    res.status(204).send();
  }),
);

export default router;
