import { Request, Response } from "express";
import NotificationService from "../services/NotificationService";
import PushService from "../services/PushService";
import { query } from "../db";

export class NotificationController {
  // GET /api/notifications - Get user's notifications
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
      const notifications = await NotificationService.getByUserId(userId, limit);

      res.json(notifications);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  }

  // GET /api/notifications/unread-count - Get unread count
  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const count = await NotificationService.getUnreadCount(userId);
      res.json({ count });
    } catch (error: any) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  }

  // PUT /api/notifications/:id/read - Mark single notification as read
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { id } = req.params;
      const success = await NotificationService.markAsRead(id, userId);

      if (success) {
        res.json({ message: "Notification marked as read" });
      } else {
        res.status(404).json({ error: "Notification not found" });
      }
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  }

  // PUT /api/notifications/mark-all-read - Mark all notifications as read
  async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const count = await NotificationService.markAllAsRead(userId);
      res.json({ message: `${count} notifications marked as read` });
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark notifications as read" });
    }
  }

  // POST /api/notifications/support-contact - Send support message to HR admins
  async supportContact(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { subject, message } = req.body;
      if (!subject?.trim() || !message?.trim()) {
        res.status(400).json({ error: "Subject and message are required" });
        return;
      }

      // Get sender info
      const senderResult = await query(
        `SELECT u.email, e.name FROM users u LEFT JOIN employees e ON e.user_id = u.id WHERE u.id = $1`,
        [userId]
      );
      const sender = senderResult.rows[0];
      const senderName = sender?.name || sender?.email || "An employee";

      // Notify all HR admins (in-app + email via notifyAdmins)
      const lang = req.headers["accept-language"]?.split(",")[0]?.trim();
      await NotificationService.notifyAdmins({
        title: `Support Request: ${subject.trim()}`,
        message: `${senderName}: ${message.trim()}`,
        type: "info",
        link: "/employees",
      }, lang);

      res.json({ message: "Support message sent successfully" });
    } catch (error: any) {
      console.error("Error sending support contact:", error);
      res.status(500).json({ error: "Failed to send support message" });
    }
  }

  // DELETE /api/notifications/:id - Delete a notification
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { id } = req.params;
      const success = await NotificationService.delete(id, userId);

      if (success) {
        res.json({ message: "Notification deleted" });
      } else {
        res.status(404).json({ error: "Notification not found" });
      }
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  }

  // GET /api/notifications/push-key - Return VAPID public key
  async getPushKey(_req: Request, res: Response): Promise<void> {
    if (!PushService.isConfigured) {
      res.status(503).json({ error: 'Push notifications not configured' });
      return;
    }
    res.json({ publicKey: PushService.publicKey });
  }

  // POST /api/notifications/push-subscribe
  async pushSubscribe(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        res.status(400).json({ error: 'Invalid subscription object' });
        return;
      }

      await PushService.saveSubscription(userId, { endpoint, keys });
      res.json({ message: 'Subscribed to push notifications' });
    } catch (err: any) {
      console.error('Error saving push subscription:', err);
      res.status(500).json({ error: 'Failed to save push subscription' });
    }
  }

  // POST /api/notifications/push-unsubscribe
  async pushUnsubscribe(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

      const { endpoint } = req.body;
      if (!endpoint) { res.status(400).json({ error: 'Endpoint required' }); return; }

      await PushService.removeSubscription(userId, endpoint);
      res.json({ message: 'Unsubscribed from push notifications' });
    } catch (err: any) {
      console.error('Error removing push subscription:', err);
      res.status(500).json({ error: 'Failed to remove push subscription' });
    }
  }
}

export default new NotificationController();
