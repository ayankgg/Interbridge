import { Schema, model, Document, Types } from 'mongoose';
import { InterviewMode, InterviewStatus } from '../types';

export interface IInterviewHistory {
  status: InterviewStatus;
  startAt?: Date;
  at: Date;
  byUserId?: Types.ObjectId;
  note?: string;
}

export interface IInterview extends Document {
  _id: Types.ObjectId;
  applicationId: Types.ObjectId;
  internshipId: Types.ObjectId;
  companyId: Types.ObjectId;
  studentId: Types.ObjectId;
  scheduledBy: Types.ObjectId;
  mode: InterviewMode;
  startAt: Date;
  endAt: Date;
  meetingLink?: string;
  location?: string;
  status: InterviewStatus;
  notes?: string;
  history: IInterviewHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const interviewSchema = new Schema<IInterview>(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    internshipId: { type: Schema.Types.ObjectId, ref: 'Internship', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    scheduledBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mode: { type: String, enum: Object.values(InterviewMode), required: true },
    startAt: { type: Date, required: true },
    endAt: {
      type: Date,
      required: true,
      validate: {
        validator(this: IInterview, value: Date): boolean {
          return !this.startAt || value > this.startAt;
        },
        message: 'endAt must be after startAt',
      },
    },
    meetingLink: { type: String, trim: true },
    location: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(InterviewStatus),
      default: InterviewStatus.SCHEDULED,
      index: true,
    },
    notes: { type: String, maxlength: 2000 },
    history: [
      {
        _id: false,
        status: { type: String, enum: Object.values(InterviewStatus) },
        startAt: Date,
        at: { type: Date, default: Date.now },
        byUserId: { type: Schema.Types.ObjectId, ref: 'User' },
        note: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete (ret as Record<string, unknown>).__v; return ret; } },
  }
);

interviewSchema.index({ studentId: 1, startAt: 1 });
interviewSchema.index({ companyId: 1, startAt: 1 });

export const Interview = model<IInterview>('Interview', interviewSchema);
export default Interview;
