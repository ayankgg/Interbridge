import { Schema, model, Document, Types } from 'mongoose';
import { UserRole, UserStatus } from '../types';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  authProvider: 'local' | 'google';
  refreshTokenHash?: string | null;
  tokenVersion: number;
  resetPasswordTokenHash?: string | null;
  resetPasswordExpires?: Date | null;
  lastLoginAt?: Date | null;
  // V2: referral system (optional, backward-compatible)
  referralCode?: string;
  referredBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
      default: UserRole.STUDENT,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
      index: true,
    },
    emailVerified: { type: Boolean, default: false },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    refreshTokenHash: { type: String, default: null, select: false },
    tokenVersion: { type: Number, default: 0 },
    resetPasswordTokenHash: { type: String, default: null, select: false },
    resetPasswordExpires: { type: Date, default: null, select: false },
    lastLoginAt: { type: Date, default: null },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        const r = ret as Record<string, unknown>;
        delete r.passwordHash;
        delete r.refreshTokenHash;
        delete r.resetPasswordTokenHash;
        delete r.resetPasswordExpires;
        delete r.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ role: 1, status: 1 });

export const User = model<IUser>('User', userSchema);
export default User;
