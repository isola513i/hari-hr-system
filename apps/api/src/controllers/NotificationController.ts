import { Request, Response } from "express";
import NotificationService from "../services/NotificationService";

export class NotificationController {
  // GET /api/notifications - Get user's notifications
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 20;
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
}

export default new NotificationController();
