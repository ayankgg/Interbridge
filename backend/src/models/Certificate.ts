import { Schema, model, Document, Types } from 'mongoose';

export interface ICertificate extends Document {
  _id: Types.ObjectId;
  certificateId: string; // public, unguessable verification code
  applicationId: Types.ObjectId;
  internshipId: Types.ObjectId;
  studentId: Types.ObjectId;
  companyId: Types.ObjectId;
  studentName: string;
  companyName: string;
  title: string;
  skills: string[];
  startDate?: Date;
  endDate?: Date;
  issuedBy: Types.ObjectId;
  issuedAt: Date;
  revoked: boolean;
  revokeReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const certificateSchema = new Schema<ICertificate>(
  {
    certificateId: { type: String, required: true, unique: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, unique: true },
    internshipId: { type: Schema.Types.ObjectId, ref: 'Internship', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    studentName: { type: String, required: true },
    companyName: { type: String, required: true },
    title: { type: String, required: true },
    skills: [{ type: String }],
    startDate: Date,
    endDate: Date,
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    issuedAt: { type: Date, default: Date.now },
    revoked: { type: Boolean, default: false },
    revokeReason: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete (ret as Record<string, unknown>).__v; return ret; } },
  }
);

export const Certificate = model<ICertificate>('Certificate', certificateSchema);
export default Certificate;
