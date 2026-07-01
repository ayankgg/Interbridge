import { Schema, model, Document, Types } from 'mongoose';
import { ReferralStatus } from '../types';

export interface IReferral extends Document {
  _id: Types.ObjectId;
  referrerId: Types.ObjectId;
  referredUserId: Types.ObjectId;
  status: ReferralStatus;
  qualifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const referralSchema = new Schema<IReferral>(
  {
    referrerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referredUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: {
      type: String,
      enum: Object.values(ReferralStatus),
      default: ReferralStatus.PENDING,
    },
    qualifiedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete (ret as Record<string, unknown>).__v; return ret; } },
  }
);

export const Referral = model<IReferral>('Referral', referralSchema);
export default Referral;
