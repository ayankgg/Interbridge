import { Schema, model, Document, Types } from 'mongoose';

export interface ISavedInternship extends Document {
  _id: Types.ObjectId;
  studentId: Types.ObjectId;
  internshipId: Types.ObjectId;
  deadlineReminderSentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const savedInternshipSchema = new Schema<ISavedInternship>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    internshipId: {
      type: Schema.Types.ObjectId,
      ref: 'Internship',
      required: true,
    },
    // Idempotency marker so a saved internship isn't reminded repeatedly.
    deadlineReminderSentAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete (ret as Record<string, unknown>).__v; return ret; } },
  }
);

savedInternshipSchema.index({ studentId: 1, internshipId: 1 }, { unique: true });
savedInternshipSchema.index({ studentId: 1, createdAt: -1 });

export const SavedInternship = model<ISavedInternship>('SavedInternship', savedInternshipSchema);
export default SavedInternship;
