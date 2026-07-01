import { Schema, model, Document, Types } from 'mongoose';
import { VerificationStatus } from '../types';

export interface ITeamMember {
  userId: Types.ObjectId;
  role: 'admin' | 'recruiter';
}

export interface ICompany extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  logoUrl?: string;
  logoPublicId?: string;
  description?: string;
  website?: string;
  industry?: string;
  size?: string;
  location: { city?: string; country?: string };
  verification: {
    status: VerificationStatus;
    docs: { name: string; url: string }[];
    verifiedBy?: Types.ObjectId | null;
    verifiedAt?: Date | null;
    reason?: string | null;
  };
  teamMembers: ITeamMember[];
  // V2: public company page (optional, backward-compatible)
  slug?: string;
  publicProfile: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    logoUrl: String,
    logoPublicId: String,
    description: { type: String, maxlength: 4000 },
    website: { type: String, trim: true },
    industry: { type: String, trim: true },
    size: { type: String, trim: true },
    location: {
      city: { type: String, trim: true },
      country: { type: String, trim: true },
    },
    verification: {
      status: {
        type: String,
        enum: Object.values(VerificationStatus),
        default: VerificationStatus.PENDING,
        index: true,
      },
      docs: [
        {
          _id: false,
          name: { type: String, required: true },
          url: { type: String, required: true },
        },
      ],
      verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      verifiedAt: { type: Date, default: null },
      reason: { type: String, default: null },
    },
    teamMembers: [
      {
        _id: false,
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['admin', 'recruiter'], default: 'recruiter' },
      },
    ],
    slug: { type: String, unique: true, sparse: true },
    publicProfile: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete (ret as Record<string, unknown>).__v; return ret; } },
  }
);

companySchema.index({ name: 'text', description: 'text' });
// Note: verification.status already has an inline index in the schema path.

export const Company = model<ICompany>('Company', companySchema);
export default Company;
