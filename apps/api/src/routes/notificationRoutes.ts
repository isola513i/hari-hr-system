import { Router } from "express";
import NotificationController from "../controllers/NotificationController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// All notification routes require authentication
router.use(authenticateToken);

// GET /api/notifications - Get user's notifications
router.get("/", NotificationController.getAll.bind(NotificationController));

// GET /api/notifications/unread-count - Get unread count
router.get(
  "/unread-count",
  NotificationController.getUnreadCount.bind(NotificationController)
);

// PUT /api/notifications/mark-all-read - Mark all as read
router.put(
  "/mark-all-read",
  NotificationController.markAllAsRead.bind(NotificationController)
);

// PUT /api/notifications/:id/read - Mark single as read
router.put(
  "/:id/read",
  NotificationController.markAsRead.bind(NotificationController)
);

// DELETE /api/notifications/:id - Delete notification
router.delete(
  "/:id",
  NotificationController.delete.bind(NotificationController)
);

export default router;
