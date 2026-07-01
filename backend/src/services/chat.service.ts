import { Types } from 'mongoose';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Application } from '../models/Application';
import { Student } from '../models/Student';
import { Company } from '../models/Company';
import { AppError } from '../utils/AppError';
import { getCursorParams, buildCursorMeta } from '../utils/pagination';
import { NotificationType, UserRole } from '../types';
import { createNotification } from './notification.service';
import { SendMessageInput } from '../validators/chat.validator';
import { emitToUser } from '../socket';

/**
 * Resolves (studentId, companyId, userIds) for a chat, enforcing the rule
 * that a conversation may exist ONLY when an application links the two parties.
 */
async function resolveContext(userId: string, role: UserRole, input: { internshipId?: string; studentId?: string; applicationId?: string }) {
  let application = null;
  if (input.applicationId) {
    application = await Application.findById(input.applicationId);
  } else if (input.internshipId && role === UserRole.STUDENT) {
    const student = await Student.findOne({ userId }).select('_id');
    if (!student) throw AppError.notFound('Student profile not found');
    application = await Application.findOne({ internshipId: input.internshipId, studentId: student._id });
  } else if (input.studentId && role === UserRole.COMPANY) {
    const company = await Company.findOne({ userId }).select('_id');
    if (!company) throw AppError.notFound('Company profile not found');
    application = await Application.findOne({ studentId: input.studentId, companyId: company._id }).sort({ createdAt: -1 });
  }

  if (!application) {
    throw AppError.forbidden('You can only message after an application connects you');
  }

  const [student, company] = await Promise.all([
    Student.findById(application.studentId).select('userId name'),
    Company.findById(application.companyId).select('userId name'),
  ]);
  if (!student || !company) throw AppError.notFound('Conversation parties not found');

  return { application, student, company };
}

export async function startConversation(
  userId: string,
  role: UserRole,
  input: { internshipId?: string; studentId?: string; applicationId?: string }
) {
  if (role === UserRole.ADMIN) throw AppError.forbidden('Admins do not start conversations');
  const { application, student, company } = await resolveContext(userId, role, input);

  const filter = {
    studentId: student._id,
    companyId: company._id,
    internshipId: application.internshipId,
  };

  let conversation = await Conversation.findOne(filter);
  if (!conversation) {
    conversation = await Conversation.create({
      ...filter,
      applicationId: application._id,
      participants: [
        { userId: student.userId, role: UserRole.STUDENT },
        { userId: company.userId, role: UserRole.COMPANY },
      ],
    });
  }
  return conversation;
}

function assertParticipant(conversation: { participants: { userId: Types.ObjectId }[] }, userId: string): void {
  const isParticipant = conversation.participants.some((p) => p.userId.equals(userId));
  if (!isParticipant) throw AppError.forbidden('You are not a participant in this conversation');
}

export async function listConversations(userId: string) {
  return Conversation.find({ 'participants.userId': new Types.ObjectId(userId) })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .populate('studentId', 'name')
    .populate('companyId', 'name logoUrl')
    .populate('internshipId', 'title')
    .limit(100)
    .lean();
}

export async function getMessages(userId: string, conversationId: string, query: Record<string, unknown>) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw AppError.notFound('Conversation not found');
  assertParticipant(conversation, userId);

  const { limit, cursor } = getCursorParams(query);
  const filter: Record<string, unknown> = { conversationId };
  if (cursor) filter._id = { $lt: new Types.ObjectId(cursor) };

  // Fetch limit+1 (newest first) to compute the next cursor
  const docs = await Message.find(filter).sort({ _id: -1 }).limit(limit + 1).lean();
  const { page, nextCursor, hasMore } = buildCursorMeta(docs as { _id: unknown }[], limit);

  return { items: page, meta: { nextCursor, hasMore } };
}

export async function sendMessage(
  userId: string,
  conversationId: string,
  input: SendMessageInput
) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw AppError.notFound('Conversation not found');
  assertParticipant(conversation, userId);

  const recipient = conversation.participants.find((p) => !p.userId.equals(userId));
  if (!recipient) throw AppError.badRequest('No recipient in conversation');

  const message = await Message.create({
    conversationId: conversation._id,
    senderId: new Types.ObjectId(userId),
    recipientId: recipient.userId,
    text: input.text,
    attachments: input.attachments ?? [],
  });

  conversation.lastMessageText = input.text.slice(0, 200);
  conversation.lastMessageAt = message.createdAt;
  conversation.lastSenderId = new Types.ObjectId(userId);
  await conversation.save();

  // Real-time push to the recipient (if connected), plus a durable notification.
  emitToUser(recipient.userId.toString(), 'message:new', {
    conversationId: conversation._id.toString(),
    message,
  });
  await createNotification({
    userId: recipient.userId,
    type: NotificationType.NEW_MESSAGE,
    title: 'New message',
    body: input.text.slice(0, 120),
    data: { conversationId: conversation._id },
  });

  return message;
}

export async function markRead(userId: string, conversationId: string) {
  if (!Types.ObjectId.isValid(conversationId)) throw AppError.badRequest('Invalid conversation id');
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw AppError.notFound('Conversation not found');
  assertParticipant(conversation, userId);

  const result = await Message.updateMany(
    { conversationId, recipientId: new Types.ObjectId(userId), readAt: null },
    { readAt: new Date() }
  );

  // Notify the other party — but never send a read-receipt to yourself.
  if (
    result.modifiedCount > 0 &&
    conversation.lastSenderId &&
    !conversation.lastSenderId.equals(userId)
  ) {
    emitToUser(conversation.lastSenderId.toString(), 'message:read', {
      conversationId: conversation._id.toString(),
      readerId: userId,
    });
  }
  return { read: result.modifiedCount };
}

export async function getUnreadCount(userId: string) {
  const count = await Message.countDocuments({ recipientId: userId, readAt: null });
  return { unread: count };
}
