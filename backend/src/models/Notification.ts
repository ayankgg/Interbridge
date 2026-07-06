import { Schema, model, Document, Types } from 'mongoose';
import { NotificationType } from '../types';

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels: string[];
  read: boolean;
  emailSent: boolean;
  whatsappSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      default: NotificationType.SYSTEM,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    channels: { type: [String], default: ['in_app'] },
    read: { type: Boolean, default: false },
    emailSent: { type: Boolean, default: false },
    whatsappSent: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete (ret as Record<string, unknown>).__v; return ret; } },
  }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
// Auto-remove read notifications after 60 days
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 60, partialFilterExpression: { read: true } }
);

export const Notification = model<INotification>('Notification', notificationSchema);
export default Notification;
