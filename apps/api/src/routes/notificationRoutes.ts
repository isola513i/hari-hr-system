import { Router } from "express";
import NotificationController from "../controllers/NotificationController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// All notification routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get current user's notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *         description: Number of notifications per page
 *       - in: query
 *         name: unreadOnly
 *         schema: { type: boolean }
 *         description: Filter to unread notifications only
 *     responses:
 *       200:
 *         description: List of notifications
 *       401: { description: Unauthorized }
 */
// GET /api/notifications - Get user's notifications
router.get("/", NotificationController.getAll.bind(NotificationController));

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get count of unread notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count: { type: integer }
 *       401: { description: Unauthorized }
 */
// GET /api/notifications/unread-count - Get unread count
router.get(
  "/unread-count",
  NotificationController.getUnreadCount.bind(NotificationController)
);

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401: { description: Unauthorized }
 */
// PUT /api/notifications/mark-all-read - Mark all as read
router.put(
  "/mark-all-read",
  NotificationController.markAllAsRead.bind(NotificationController)
);

/**
 * @swagger
 * /api/notifications/support-contact:
 *   post:
 *     summary: Send a support message to HR admins
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, message]
 *             properties:
 *               subject: { type: string }
 *               message: { type: string }
 *     responses:
 *       200:
 *         description: Support message sent successfully
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
// POST /api/notifications/support-contact - Send support message to HR admins
router.post(
  "/support-contact",
  NotificationController.supportContact.bind(NotificationController)
);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
// PUT /api/notifications/:id/read - Mark single as read
router.put(
  "/:id/read",
  NotificationController.markAsRead.bind(NotificationController)
);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
// DELETE /api/notifications/:id - Delete notification
router.delete(
  "/:id",
  NotificationController.delete.bind(NotificationController)
);

/**
 * @swagger
 * /api/notifications/push-key:
 *   get:
 *     summary: Get VAPID public key for push notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: VAPID public key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 publicKey: { type: string }
 *       401: { description: Unauthorized }
 */
// GET /api/notifications/push-key - VAPID public key
router.get("/push-key", NotificationController.getPushKey.bind(NotificationController));

/**
 * @swagger
 * /api/notifications/push-subscribe:
 *   post:
 *     summary: Save a push notification subscription
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subscription]
 *             properties:
 *               subscription:
 *                 type: object
 *                 description: Web Push subscription object
 *                 properties:
 *                   endpoint: { type: string }
 *                   keys:
 *                     type: object
 *                     properties:
 *                       p256dh: { type: string }
 *                       auth: { type: string }
 *     responses:
 *       200:
 *         description: Push subscription saved successfully
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
// POST /api/notifications/push-subscribe - Save push subscription
router.post("/push-subscribe", NotificationController.pushSubscribe.bind(NotificationController));

/**
 * @swagger
 * /api/notifications/push-unsubscribe:
 *   post:
 *     summary: Remove a push notification subscription
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [endpoint]
 *             properties:
 *               endpoint: { type: string, description: The push subscription endpoint URL }
 *     responses:
 *       200:
 *         description: Push subscription removed successfully
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
// POST /api/notifications/push-unsubscribe - Remove push subscription
router.post("/push-unsubscribe", NotificationController.pushUnsubscribe.bind(NotificationController));

export default router;
