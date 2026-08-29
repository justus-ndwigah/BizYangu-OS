import {
  pgTable,
  serial,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  pgEnum,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

// ── SHOP SETTINGS (single row, id = 1) ───────────────────────────────────
// Holds the business profile used on receipts/reports and app-wide defaults.
// Populated by the first-run setup wizard.
export const shopSettings = pgTable("shop_settings", {
  id: integer("id").primaryKey().default(1),
  shopName: text("shop_name").notNull().default("My Shop"),
  ownerName: text("owner_name"),
  phone: text("phone"),
  address: text("address"),
  currency: text("currency").notNull().default("KES"),
  receiptFooter: text("receipt_footer").default("Thank you for shopping with us!"),
  defaultLowStockThreshold: integer("default_low_stock_threshold")
    .notNull()
    .default(5),
  mpesaShortcode: text("mpesa_shortcode"),
  setupComplete: boolean("setup_complete").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── PRODUCTS ───────────────────────────────────────────────────────────────
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").unique(),
  category: text("category").notNull(),
  buyingPrice: numeric("buying_price", { precision: 12, scale: 2 }).notNull(),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  unit: text("unit").notNull().default("pcs"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── CUSTOMERS ─────────────────────────────────────────────────────────────
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  totalDebt: numeric("total_debt", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── PAYMENT METHOD ENUM ───────────────────────────────────────────────────
export const paymentMethodEnum = pgEnum("payment_method", [
  "Cash",
  "M-PESA",
  "Credit",
]);

// ── SALES ─────────────────────────────────────────────────────────────────
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  receiptNumber: text("receipt_number").notNull().unique(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  method: paymentMethodEnum("method").notNull(),
  onCredit: boolean("on_credit").notNull().default(false),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  customerName: text("customer_name"),
  mpesaRef: text("mpesa_ref"),
  mpesaReceipt: text("mpesa_receipt"),
  // Who served this sale. Denormalized (servedByName stored alongside the
  // FK) for the same reason customerName is: a receipt is a historical
  // record and shouldn't change retroactively if the cashier's account is
  // later renamed or deactivated.
  servedById: varchar("served_by_id").references(() => usersTable.id, { onDelete: "set null" }),
  servedByName: text("served_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── SALE ITEMS ────────────────────────────────────────────────────────────
export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull().references(() => sales.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
});

// ── DEBTS ─────────────────────────────────────────────────────────────────
export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  customerName: text("customer_name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  settled: boolean("settled").notNull().default(false),
  settledAt: timestamp("settled_at"),
  saleId: integer("sale_id").references(() => sales.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── MPESA TRANSACTIONS ────────────────────────────────────────────────────
export const mpesaStatusEnum = pgEnum("mpesa_status", [
  "Pending",
  "Confirmed",
  "Failed",
]);

export const mpesaTransactions = pgTable("mpesa_transactions", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: mpesaStatusEnum("status").notNull().default("Pending"),
  checkoutRequestId: text("checkout_request_id"),
  mpesaReceiptNumber: text("mpesa_receipt_number"),
  failureReason: text("failure_reason"),
  saleId: integer("sale_id").references(() => sales.id, { onDelete: "set null" }),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── AUDIT LOGS ────────────────────────────────────────────────────────────
// A simple, append-only trail of who did what. Denormalizes userName (same
// reasoning as customerName/servedByName elsewhere): a log entry is a
// historical record and shouldn't change if the user's account is later
// renamed or deactivated. entityId is stored as text since different entity
// types use different id types (integer for products/sales, varchar for
// users).
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  userName: text("user_name"),
  action: text("action").notNull(), // e.g. "product.created", "user.deactivated"
  entityType: text("entity_type").notNull(), // e.g. "product", "sale", "user", "debt"
  entityId: text("entity_id"),
  summary: text("summary").notNull(), // short human-readable description for the activity log UI
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
