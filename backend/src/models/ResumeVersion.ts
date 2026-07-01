import { Schema, model, Document, Types } from 'mongoose';
import type { ResumeReport } from '../utils/resumeScoring';

export type ResumeAnalysisStatus = 'parsed' | 'analyzing' | 'analyzed' | 'failed';

export interface IResumeVersion extends Document {
  _id: Types.ObjectId;
  studentId: Types.ObjectId;
  userId: Types.ObjectId;
  version: number;
  file: {
    fileUrl?: string;
    publicId?: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  };
  extractedText?: string;
  wordCount: number;
  pageCount?: number;
  status: ResumeAnalysisStatus;
  report?: ResumeReport;
  // Denormalized headline scores for fast dashboard/timeline queries.
  scores: { overall: number; ats: number; grammar: number; keyword: number; skill: number };
  rewrite?: Record<string, unknown> | null;
  analyzedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const resumeVersionSchema = new Schema<IResumeVersion>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    version: { type: Number, required: true },
    file: {
      // Optional: when Cloudinary isn't configured the analysis still runs and
      // is stored; only the archived file URL is absent.
      fileUrl: { type: String },
      publicId: String,
      originalName: { type: String, required: true },
      mimeType: { type: String, required: true },
      sizeBytes: { type: Number, required: true },
    },
    // Large field — excluded from list queries by default.
    extractedText: { type: String, select: false },
    wordCount: { type: Number, default: 0 },
    pageCount: Number,
    status: {
      type: String,
      enum: ['parsed', 'analyzing', 'analyzed', 'failed'],
      default: 'parsed',
      index: true,
    },
    report: { type: Schema.Types.Mixed },
    scores: {
      overall: { type: Number, default: 0 },
      ats: { type: Number, default: 0 },
      grammar: { type: Number, default: 0 },
      keyword: { type: Number, default: 0 },
      skill: { type: Number, default: 0 },
    },
    rewrite: { type: Schema.Types.Mixed, default: null },
    analyzedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete (ret as Record<string, unknown>).__v; return ret; } },
  }
);

// One record per (student, version); newest-first history.
resumeVersionSchema.index({ studentId: 1, version: -1 }, { unique: true });
resumeVersionSchema.index({ studentId: 1, createdAt: -1 });

export const ResumeVersion = model<IResumeVersion>('ResumeVersion', resumeVersionSchema);
export default ResumeVersion;
