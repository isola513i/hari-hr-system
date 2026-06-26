import { query } from "../db";
import {
  Notification,
  CreateNotificationRequest,
  NotificationResponse,
} from "../models/Notification";
import { emitNotificationCreated, emitNotificationRefresh } from "../socket";
import EmailService from "./EmailService";
import PushService from "./PushService";
import logger from '../utils/logger';

// Helper function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
}

// Transform database notification to response format
function toResponse(notification: Notification): NotificationResponse {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    read: notification.read,
    link: notification.link,
    time: formatRelativeTime(new Date(notification.created_at)),
    created_at: notification.created_at,
  };
}

export class NotificationService {
  // Get all notifications for a user
  async getByUserId(
    userId: string,
    limit: number = 20
  ): Promise<NotificationResponse[]> {
    const result = await query(
      `SELECT id, user_id, title, message, type, read, link, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows.map(toResponse);
  }

  // Get unread notification count for a user
  async getUnreadCount(userId: string): Promise<number> {
    const result = await query(
      `SELECT COUNT(*) as count FROM notifications
       WHERE user_id = $1 AND read = FALSE`,
      [userId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  // Create a new notification
  async create(data: CreateNotificationRequest, lang?: string): Promise<NotificationResponse> {
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.user_id, data.title, data.message, data.type || "info", data.link]
    );
    const notification = toResponse(result.rows[0]);
    emitNotificationCreated(notification);

    // Send web push notification (fire-and-forget)
    PushService.sendToUser(data.user_id, {
      title: data.title,
      body: data.message,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      url: data.link || '/',
    }).catch((err) => logger.error(err, 'PushService: failed to send push'));

    // Send email notification if user has email notifications enabled
    query(
      `SELECT u.email, u.email_notifications FROM users u WHERE u.id = $1`,
      [data.user_id]
    ).then((userResult) => {
      const user = userResult.rows[0];
      if (user?.email_notifications) {
        EmailService.sendNotificationEmail(user.email, data.title, data.message, data.link, lang)
          .catch((err) => logger.error(err, "EmailService: Failed to send notification email:"));
      }
    }).catch((err) => logger.error(err, "NotificationService: Failed to check email preferences:"));

    return notification;
  }

  // Create notifications for multiple users
  async createForMultipleUsers(
    userIds: string[],
    data: Omit<CreateNotificationRequest, "user_id">
  ): Promise<void> {
    if (userIds.length === 0) return;

    const values = userIds
      .map(
        (_, i) =>
          `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`
      )
      .join(", ");

    const params = userIds.flatMap((userId) => [
      userId,
      data.title,
      data.message,
      data.type || "info",
      data.link,
    ]);

    await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ${values}`,
      params
    );
    emitNotificationRefresh();
  }

  // Create notification for all HR admins
  async notifyAdmins(
    data: Omit<CreateNotificationRequest, "user_id">,
    lang?: string
  ): Promise<void> {
    const admins = await query(
      `SELECT id, email, email_notifications FROM users WHERE role = 'HR_ADMIN'`
    );
    const adminIds = admins.rows.map((row) => row.id);
    await this.createForMultipleUsers(adminIds, data);

    // Send email to admins who have email notifications enabled
    for (const admin of admins.rows) {
      if (admin.email_notifications) {
        EmailService.sendNotificationEmail(admin.email, data.title, data.message, data.link, lang)
          .catch((err) => logger.error(err, "EmailService: Failed to send admin notification email:"));
      }
    }
  }

  // Create notification for all users (employees + admins)
  async notifyAll(
    data: Omit<CreateNotificationRequest, "user_id">,
    lang?: string
  ): Promise<void> {
    const users = await query(
      `SELECT id, email, email_notifications FROM users`
    );
    const userIds = users.rows.map((row) => row.id);
    await this.createForMultipleUsers(userIds, data);

    // Send email to users who have email notifications enabled
    for (const user of users.rows) {
      if (user.email_notifications) {
        EmailService.sendNotificationEmail(user.email, data.title, data.message, data.link, lang)
          .catch((err) => logger.error(err, "EmailService: Failed to send notification email:"));
      }
    }
  }

  // Mark a notification as read
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await query(
      `UPDATE notifications
       SET read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<number> {
    const result = await query(
      `UPDATE notifications
       SET read = TRUE
       WHERE user_id = $1 AND read = FALSE`,
      [userId]
    );
    return result.rowCount ?? 0;
  }

  // Delete a notification
  async delete(notificationId: string, userId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM notifications
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Delete old notifications (cleanup job)
  async deleteOlderThan(days: number): Promise<number> {
    const result = await query(
      `DELETE FROM notifications
       WHERE created_at < NOW() - INTERVAL '1 day' * $1`,
      [days]
    );
    return result.rowCount ?? 0;
  }
}

export default new NotificationService();
