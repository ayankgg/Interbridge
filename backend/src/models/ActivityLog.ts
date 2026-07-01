import { Schema, model, Document, Types } from 'mongoose';

export interface IActivityLog extends Document {
  _id: Types.ObjectId;
  actorUserId?: Types.ObjectId | null;
  actorRole?: string;
  action: string;
  targetType?: string;
  targetId?: Types.ObjectId | null;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorRole: String,
    action: { type: String, required: true },
    targetType: String,
    targetId: { type: Schema.Types.ObjectId, default: null },
    ip: String,
    userAgent: String,
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activityLogSchema.index({ actorUserId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ targetType: 1, targetId: 1 });

export const ActivityLog = model<IActivityLog>('ActivityLog', activityLogSchema);
export default ActivityLog;
