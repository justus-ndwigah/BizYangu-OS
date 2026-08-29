import { db, auditLogs } from '@workspace/db';
import { desc } from 'drizzle-orm';
import { Router, type IRouter, type Request, type Response } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import { requireAdmin } from '../middlewares/authMiddleware';

const router: IRouter = Router();

type AuditLogRow = typeof auditLogs.$inferSelect;

function mapAuditLog(row: AuditLogRow) {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.userName,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    summary: row.summary,
    createdAt: row.createdAt,
  };
}

// GET /audit-logs — most recent activity first, capped at 200 entries.
// Admin-only: this is a staff-accountability tool (who added/edited/removed
// what), not something a cashier needs day-to-day.
router.get(
  '/audit-logs',
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(200);
    res.json(rows.map(mapAuditLog));
  }),
);

export default router;
