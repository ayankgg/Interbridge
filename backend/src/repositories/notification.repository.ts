import { BaseRepository } from './base.repository';
import { Notification, INotification } from '../models/Notification';

/**
 * Concrete repository for notifications. Domain-specific reads live here so
 * the service layer never writes raw Mongoose queries.
 */
class NotificationRepository extends BaseRepository<INotification> {
  constructor() {
    super(Notification);
  }

  countUnread(userId: string): Promise<number> {
    return this.count({ userId, read: false } as never);
  }

  markAllRead(userId: string): Promise<number> {
    return this.updateMany({ userId, read: false } as never, { read: true } as never);
  }
}

// Single shared instance — simple manual dependency injection without a container.
export const notificationRepository = new NotificationRepository();
