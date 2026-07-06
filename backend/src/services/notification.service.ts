import { Types } from 'mongoose';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { Student } from '../models/Student';
import { NotificationType } from '../types';
import { getPagination, buildMeta } from '../utils/pagination';
import { AppError } from '../utils/AppError';
import { sendEmail } from './email.service';
import { sendWhatsAppMessage } from './whatsapp.service';
import { notificationRepository } from '../repositories/notification.repository';
import { escapeHtml } from '../utils/sanitize';
import { logger } from '../config/logger';

interface CreateNotificationInput {
  userId: string | Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels?: string[];
  email?: boolean;
  // Attempt a WhatsApp send if the student has opted in for this preference.
  whatsapp?: boolean;
  whatsappPreference?: 'applicationUpdates' | 'newMatches';
}

/**
 * Persists an in-app notification and optionally dispatches an email.
 * Never throws to the caller — notifications must not break core flows.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    const channels = input.channels ?? (input.email ? ['in_app', 'email'] : ['in_app']);
    const notification = await Notification.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data,
      channels,
    });

    if (input.email || channels.includes('email')) {
      const user = await User.findById(input.userId).select('email');
      if (user) {
        await sendEmail({
          to: user.email,
          subject: input.title,
          html: `<h3>${escapeHtml(input.title)}</h3><p>${escapeHtml(input.body)}</p>`,
        });
        notification.emailSent = true;
        await notification.save();
      }
    }

    if (input.whatsapp) {
      const prefKey = input.whatsappPreference ?? 'applicationUpdates';
      const student = await Student.findOne({ userId: input.userId }).select(
        'whatsappNumber notificationPreferences'
      );
      const prefs = student?.notificationPreferences?.whatsapp;
      if (student?.whatsappNumber && prefs?.enabled && prefs[prefKey]) {
        await sendWhatsAppMessage(student.whatsappNumber, `${input.title}: ${input.body}`);
        notification.channels.push('whatsapp');
        notification.whatsappSent = true;
        await notification.save();
      }
    }
  } catch (err) {
    logger.error('Failed to create notification', err);
  }
}

export async function listNotifications(
  userId: string,
  query: { page?: unknown; limit?: unknown; unread?: unknown }
) {
  const { page, limit, skip } = getPagination(query);
  const filter: Record<string, unknown> = { userId };
  if (query.unread === 'true') filter.read = false;

  const [{ items, total }, unreadCount] = await Promise.all([
    notificationRepository.paginate(filter as never, { skip, limit, sort: { createdAt: -1 } }),
    notificationRepository.countUnread(userId),
  ]);

  return { items, meta: { ...buildMeta(page, limit, total), unreadCount } };
}

export async function markRead(userId: string, notificationId: string) {
  const notification = await notificationRepository.updateOne(
    { _id: notificationId, userId } as never,
    { read: true } as never
  );
  if (!notification) throw AppError.notFound('Notification not found');
  return notification;
}

export async function markAllRead(userId: string) {
  const updated = await notificationRepository.markAllRead(userId);
  return { updated };
}
