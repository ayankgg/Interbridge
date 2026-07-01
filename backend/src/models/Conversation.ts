import { Schema, model, Document, Types } from 'mongoose';
import { UserRole } from '../types';

export interface IConversation extends Document {
  _id: Types.ObjectId;
  participants: { userId: Types.ObjectId; role: UserRole }[];
  studentId: Types.ObjectId;
  companyId: Types.ObjectId;
  internshipId?: Types.ObjectId | null;
  applicationId?: Types.ObjectId | null;
  lastMessageText?: string;
  lastMessageAt?: Date;
  lastSenderId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [
      {
        _id: false,
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: Object.values(UserRole), required: true },
      },
    ],
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    internshipId: { type: Schema.Types.ObjectId, ref: 'Internship', default: null },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', default: null },
    lastMessageText: String,
    lastMessageAt: { type: Date, index: true },
    lastSenderId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete (ret as Record<string, unknown>).__v; return ret; } },
  }
);

conversationSchema.index({ 'participants.userId': 1, lastMessageAt: -1 });
// One conversation thread per student↔company↔internship context
conversationSchema.index({ studentId: 1, companyId: 1, internshipId: 1 }, { unique: true });

export const Conversation = model<IConversation>('Conversation', conversationSchema);
export default Conversation;
