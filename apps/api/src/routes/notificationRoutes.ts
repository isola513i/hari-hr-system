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

// POST /api/notifications/support-contact - Send support message to HR admins
router.post(
  "/support-contact",
  NotificationController.supportContact.bind(NotificationController)
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

// GET /api/notifications/push-key - VAPID public key
router.get("/push-key", NotificationController.getPushKey.bind(NotificationController));

// POST /api/notifications/push-subscribe - Save push subscription
router.post("/push-subscribe", NotificationController.pushSubscribe.bind(NotificationController));

// POST /api/notifications/push-unsubscribe - Remove push subscription
router.post("/push-unsubscribe", NotificationController.pushUnsubscribe.bind(NotificationController));

export default router;
