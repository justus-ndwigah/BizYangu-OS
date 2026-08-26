import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { mpesaTransactions } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";

import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middlewares/authMiddleware";
import { HttpError } from "../middlewares/errorHandler";
import { getDarajaConfig, initiateStkPush } from "../lib/daraja";

const router = Router();
export const mpesaPublicRouter = Router();

type MpesaRow = typeof mpesaTransactions.$inferSelect;

function mapStatus(s: string): "pending" | "success" | "failed" {
  if (s === "Confirmed") return "success";
  if (s === "Failed") return "failed";
  return "pending";
}

function mapTransaction(t: MpesaRow) {
  return {
    id: t.id,
    phone: t.phone,
    amount: Number(t.amount),
    status: mapStatus(t.status),
    description: null,
    checkoutRequestId: t.checkoutRequestId,
    mpesaReceipt: t.mpesaReceiptNumber,
    failureReason: t.failureReason ?? null,
    createdAt: t.createdAt,
    confirmedAt: t.confirmedAt,
  };
}

const stkPushSchema = z.object({
  phone: z.string().trim().min(9),
  amount: z.number().positive(),
  saleId: z.number().int().positive().nullable().optional(),
});

// POST /mpesa/stk-push
// Uses the real Safaricom Daraja API when MPESA_* env vars are configured;
// otherwise simulates a confirmation after a few seconds so the app is fully
// testable without live M-PESA credentials.
router.post(
  "/mpesa/stk-push",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { phone, amount, saleId } = stkPushSchema.parse(req.body);
    const darajaConfig = getDarajaConfig();

    if (darajaConfig) {
      const reference = saleId ? `SALE${saleId}` : `POS${Date.now()}`;
      const result = await initiateStkPush(darajaConfig, phone, amount, reference);

      const [txn] = await db
        .insert(mpesaTransactions)
        .values({
          phone,
          amount: String(amount),
          status: "Pending",
          checkoutRequestId: result.checkoutRequestId,
          saleId: saleId ?? null,
        })
        .returning();

      res.status(201).json({
        transactionId: txn.id,
        checkoutRequestId: result.checkoutRequestId,
        message: `STK Push sent to ${phone}. Ask the customer to enter their M-PESA PIN.`,
      });
      return;
    }

    // Simulation mode (no MPESA_* credentials configured).
    const checkoutRequestId = `ws_CO_SIM_${Date.now()}_${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const [txn] = await db
      .insert(mpesaTransactions)
      .values({
        phone,
        amount: String(amount),
        status: "Pending",
        checkoutRequestId,
        saleId: saleId ?? null,
      })
      .returning();

    setTimeout(async () => {
      const receipt = `MP${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      await db
        .update(mpesaTransactions)
        .set({ status: "Confirmed", mpesaReceiptNumber: receipt, confirmedAt: new Date() })
        .where(eq(mpesaTransactions.id, txn.id));
    }, 3000);

    res.status(201).json({
      transactionId: txn.id,
      checkoutRequestId,
      message: `[Simulated] STK Push sent to ${phone}. Set MPESA_CONSUMER_KEY etc. in your environment to use real M-PESA.`,
    });
  }),
);

// POST /mpesa/callback — Safaricom calls this URL with the payment result.
// Must stay unauthenticated (Safaricom can't send session cookies), but only
// updates a transaction that already exists by checkoutRequestId.
mpesaPublicRouter.post(
  "/mpesa/callback",
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as {
      Body?: {
        stkCallback?: {
          CheckoutRequestID?: string;
          ResultCode?: number;
          ResultDesc?: string;
          CallbackMetadata?: { Item?: { Name: string; Value: string | number }[] };
        };
      };
    };
    const callback = body.Body?.stkCallback;
    if (!callback?.CheckoutRequestID) {
      res.json({ ResultCode: 0, ResultDesc: "Accepted" });
      return;
    }

    const [txn] = await db
      .select()
      .from(mpesaTransactions)
      .where(eq(mpesaTransactions.checkoutRequestId, callback.CheckoutRequestID));

    if (txn) {
      if (callback.ResultCode === 0) {
        const receipt = callback.CallbackMetadata?.Item?.find(
          (i) => i.Name === "MpesaReceiptNumber",
        )?.Value as string | undefined;
        await db
          .update(mpesaTransactions)
          .set({ status: "Confirmed", mpesaReceiptNumber: receipt ?? null, confirmedAt: new Date() })
          .where(eq(mpesaTransactions.id, txn.id));
      } else {
        await db
          .update(mpesaTransactions)
          .set({ status: "Failed", failureReason: callback.ResultDesc ?? "Payment failed" })
          .where(eq(mpesaTransactions.id, txn.id));
      }
    }

    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }),
);

// GET /mpesa/transactions
router.get(
  "/mpesa/transactions",
  requireAuth,
  asyncHandler(async (_req: Request, res: Response) => {
    const rows = await db.select().from(mpesaTransactions).orderBy(desc(mpesaTransactions.createdAt));
    res.json(rows.map(mapTransaction));
  }),
);

// GET /mpesa/transactions/:id
router.get(
  "/mpesa/transactions/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const [row] = await db.select().from(mpesaTransactions).where(eq(mpesaTransactions.id, id));
    if (!row) throw new HttpError(404, "Not found");
    res.json(mapTransaction(row));
  }),
);

// GET /mpesa/summary
router.get(
  "/mpesa/summary",
  requireAuth,
  asyncHandler(async (_req: Request, res: Response) => {
    const rows = await db.select().from(mpesaTransactions);
    const totalConfirmed = rows
      .filter((r) => r.status === "Confirmed")
      .reduce((sum, r) => sum + Number(r.amount), 0);

    res.json({
      totalConfirmed,
      pendingCount: rows.filter((r) => r.status === "Pending").length,
      failedCount: rows.filter((r) => r.status === "Failed").length,
      confirmedCount: rows.filter((r) => r.status === "Confirmed").length,
    });
  }),
);

export default router;
