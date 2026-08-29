import { db, auditLogs } from '@workspace/db';
import type { Request } from 'express';

interface LogAuditInput {
  req: Request;
  action: string; // e.g. "product.created", "user.deactivated"
  entityType: string; // e.g. "product", "sale", "user", "debt", "customer"
  entityId?: string | number | null;
  summary: string; // short human-readable line for the Activity Log UI
}

/**
 * Records a single audit trail entry. Never throws — a logging failure
 * should never break the actual business operation it's describing, so
 * errors here are swallowed (and printed) rather than propagated.
 */
export async function logAudit({ req, action, entityType, entityId, summary }: LogAuditInput) {
  try {
    await db.insert(auditLogs).values({
      userId: req.user?.id ?? null,
      userName: req.user ? `${req.user.firstName} ${req.user.lastName}`.trim() : null,
      action,
      entityType,
      entityId: entityId === undefined || entityId === null ? null : String(entityId),
      summary,
    });
  } catch (err) {
    console.error('Failed to write audit log entry:', err);
  }
}
