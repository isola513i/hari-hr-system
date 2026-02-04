"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const NotificationService_1 = __importDefault(require("../services/NotificationService"));
class NotificationController {
    // GET /api/notifications - Get user's notifications
    getAll(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    res.status(401).json({ error: "Unauthorized" });
                    return;
                }
                const limit = parseInt(req.query.limit) || 20;
                const notifications = yield NotificationService_1.default.getByUserId(userId, limit);
                res.json(notifications);
            }
            catch (error) {
                console.error("Error fetching notifications:", error);
                res.status(500).json({ error: "Failed to fetch notifications" });
            }
        });
    }
    // GET /api/notifications/unread-count - Get unread count
    getUnreadCount(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    res.status(401).json({ error: "Unauthorized" });
                    return;
                }
                const count = yield NotificationService_1.default.getUnreadCount(userId);
                res.json({ count });
            }
            catch (error) {
                console.error("Error fetching unread count:", error);
                res.status(500).json({ error: "Failed to fetch unread count" });
            }
        });
    }
    // PUT /api/notifications/:id/read - Mark single notification as read
    markAsRead(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    res.status(401).json({ error: "Unauthorized" });
                    return;
                }
                const { id } = req.params;
                const success = yield NotificationService_1.default.markAsRead(id, userId);
                if (success) {
                    res.json({ message: "Notification marked as read" });
                }
                else {
                    res.status(404).json({ error: "Notification not found" });
                }
            }
            catch (error) {
                console.error("Error marking notification as read:", error);
                res.status(500).json({ error: "Failed to mark notification as read" });
            }
        });
    }
    // PUT /api/notifications/mark-all-read - Mark all notifications as read
    markAllAsRead(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    res.status(401).json({ error: "Unauthorized" });
                    return;
                }
                const count = yield NotificationService_1.default.markAllAsRead(userId);
                res.json({ message: `${count} notifications marked as read` });
            }
            catch (error) {
                console.error("Error marking all notifications as read:", error);
                res.status(500).json({ error: "Failed to mark notifications as read" });
            }
        });
    }
    // DELETE /api/notifications/:id - Delete a notification
    delete(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    res.status(401).json({ error: "Unauthorized" });
                    return;
                }
                const { id } = req.params;
                const success = yield NotificationService_1.default.delete(id, userId);
                if (success) {
                    res.json({ message: "Notification deleted" });
                }
                else {
                    res.status(404).json({ error: "Notification not found" });
                }
            }
            catch (error) {
                console.error("Error deleting notification:", error);
                res.status(500).json({ error: "Failed to delete notification" });
            }
        });
    }
}
exports.NotificationController = NotificationController;
exports.default = new NotificationController();
