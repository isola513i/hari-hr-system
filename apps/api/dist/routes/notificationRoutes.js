"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const NotificationController_1 = __importDefault(require("../controllers/NotificationController"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// All notification routes require authentication
router.use(auth_1.authenticateToken);
// GET /api/notifications - Get user's notifications
router.get("/", NotificationController_1.default.getAll.bind(NotificationController_1.default));
// GET /api/notifications/unread-count - Get unread count
router.get("/unread-count", NotificationController_1.default.getUnreadCount.bind(NotificationController_1.default));
// PUT /api/notifications/mark-all-read - Mark all as read
router.put("/mark-all-read", NotificationController_1.default.markAllAsRead.bind(NotificationController_1.default));
// PUT /api/notifications/:id/read - Mark single as read
router.put("/:id/read", NotificationController_1.default.markAsRead.bind(NotificationController_1.default));
// DELETE /api/notifications/:id - Delete notification
router.delete("/:id", NotificationController_1.default.delete.bind(NotificationController_1.default));
exports.default = router;
