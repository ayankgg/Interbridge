import { Schema, model, Document, Types } from 'mongoose';

export interface IAnalytics extends Document {
  _id: Types.ObjectId;
  scope: 'platform' | 'company' | 'student' | 'internship';
  refId?: Types.ObjectId | null;
  metric: string;
  value: number;
  dimensions?: Record<string, unknown>;
  period?: string;
  computedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const analyticsSchema = new Schema<IAnalytics>(
  {
    scope: {
      type: String,
      enum: ['platform', 'company', 'student', 'internship'],
      required: true,
    },
    refId: { type: Schema.Types.ObjectId, default: null },
    metric: { type: String, required: true },
    value: { type: Number, default: 0 },
    dimensions: { type: Schema.Types.Mixed },
    period: { type: String },
    computedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete (ret as Record<string, unknown>).__v; return ret; } },
  }
);

analyticsSchema.index({ scope: 1, refId: 1, metric: 1, period: 1 });
analyticsSchema.index({ metric: 1, computedAt: -1 });

export const Analytics = model<IAnalytics>('Analytics', analyticsSchema);
export default Analytics;
