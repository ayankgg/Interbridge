import { Schema, model, Document, Types } from 'mongoose';
import { ReportTargetType, ReportReason, ReportStatus } from '../types';

export interface IReport extends Document {
  _id: Types.ObjectId;
  reporterId: Types.ObjectId;
  targetType: ReportTargetType;
  targetId: Types.ObjectId;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  resolution?: string;
  handledBy?: Types.ObjectId | null;
  handledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: { type: String, enum: Object.values(ReportTargetType), required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, enum: Object.values(ReportReason), required: true },
    description: { type: String, maxlength: 2000 },
    status: {
      type: String,
      enum: Object.values(ReportStatus),
      default: ReportStatus.OPEN,
      index: true,
    },
    resolution: { type: String, maxlength: 2000 },
    handledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    handledAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete (ret as Record<string, unknown>).__v; return ret; } },
  }
);

// One report per (reporter, target) to curb duplicate-spam reporting
reportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 }, { unique: true });
reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ status: 1, createdAt: -1 });

export const Report = model<IReport>('Report', reportSchema);
export default Report;
