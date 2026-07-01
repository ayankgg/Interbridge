import { Types } from 'mongoose';
import { ActivityLog } from '../models/ActivityLog';
import { logger } from '../config/logger';

export interface AuditEntry {
  actorUserId?: string | Types.ObjectId | null;
  actorRole?: string;
  action: string;
  targetType?: string;
  targetId?: string | Types.ObjectId | null;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Records a tamper-evident audit entry. Fire-and-forget: auditing must never
 * break the primary operation, so failures are logged, not thrown.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await ActivityLog.create({
      ...entry,
      actorUserId: entry.actorUserId ?? null,
      targetId: entry.targetId ?? null,
    });
  } catch (err) {
    logger.error('Audit write failed', { action: entry.action, err });
  }
}
