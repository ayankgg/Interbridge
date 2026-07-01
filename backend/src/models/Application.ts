import { Schema, model, Document, Types } from 'mongoose';
import { ApplicationStatus } from '../types';

export interface IStatusHistory {
  status: ApplicationStatus;
  at: Date;
  byUserId?: Types.ObjectId;
  note?: string;
}

export interface IApplication extends Document {
  _id: Types.ObjectId;
  internshipId: Types.ObjectId;
  studentId: Types.ObjectId;
  companyId: Types.ObjectId;
  status: ApplicationStatus;
  matchScore: number;
  matchBreakdown?: Record<string, unknown>;
  coverLetter?: string;
  snapshot: {
    name: string;
    headline?: string;
    skills: { name: string; proficiency: string }[];
    projects: { title: string; techStack: string[] }[];
    resumeUrl?: string;
  };
  statusHistory: IStatusHistory[];
  companyNotes: { text: string; byUserId: Types.ObjectId; at: Date }[];
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    internshipId: {
      type: Schema.Types.ObjectId,
      ref: 'Internship',
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ApplicationStatus),
      default: ApplicationStatus.PENDING,
      index: true,
    },
    matchScore: { type: Number, default: 0, min: 0, max: 100 },
    matchBreakdown: { type: Schema.Types.Mixed },
    coverLetter: { type: String, maxlength: 3000 },
    snapshot: {
      name: { type: String, required: true },
      headline: String,
      skills: [{ _id: false, name: String, proficiency: String }],
      projects: [{ _id: false, title: String, techStack: [String] }],
      resumeUrl: String,
    },
    statusHistory: [
      {
        _id: false,
        status: { type: String, enum: Object.values(ApplicationStatus) },
        at: { type: Date, default: Date.now },
        byUserId: { type: Schema.Types.ObjectId, ref: 'User' },
        note: String,
      },
    ],
    companyNotes: [
      {
        _id: false,
        text: { type: String, required: true },
        byUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        at: { type: Date, default: Date.now },
      },
    ],
    rating: { type: Number, min: 1, max: 5 },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete (ret as Record<string, unknown>).__v; return ret; } },
  }
);

// Prevent duplicate applications
applicationSchema.index({ internshipId: 1, studentId: 1 }, { unique: true });
applicationSchema.index({ internshipId: 1, status: 1 });
applicationSchema.index({ studentId: 1, status: 1 });
applicationSchema.index({ companyId: 1, createdAt: -1 });
applicationSchema.index({ internshipId: 1, matchScore: -1 });

export const Application = model<IApplication>('Application', applicationSchema);
export default Application;
