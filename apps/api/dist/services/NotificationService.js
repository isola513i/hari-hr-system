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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const db_1 = require("../db");
// Helper function to format relative time
function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffSeconds < 60) {
        return "just now";
    }
    else if (diffMinutes < 60) {
        return `${diffMinutes} min ago`;
    }
    else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    }
    else if (diffDays < 7) {
        return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    }
    else {
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
        });
    }
}
// Transform database notification to response format
function toResponse(notification) {
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
class NotificationService {
    // Get all notifications for a user
    getByUserId(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, limit = 20) {
            const result = yield (0, db_1.query)(`SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`, [userId, limit]);
            return result.rows.map(toResponse);
        });
    }
    // Get unread notification count for a user
    getUnreadCount(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)(`SELECT COUNT(*) as count FROM notifications
       WHERE user_id = $1 AND read = FALSE`, [userId]);
            return parseInt(result.rows[0].count, 10);
        });
    }
    // Create a new notification
    create(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)(`INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [data.user_id, data.title, data.message, data.type || "info", data.link]);
            return toResponse(result.rows[0]);
        });
    }
    // Create notifications for multiple users
    createForMultipleUsers(userIds, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (userIds.length === 0)
                return;
            const values = userIds
                .map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`)
                .join(", ");
            const params = userIds.flatMap((userId) => [
                userId,
                data.title,
                data.message,
                data.type || "info",
                data.link,
            ]);
            yield (0, db_1.query)(`INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ${values}`, params);
        });
    }
    // Create notification for all HR admins
    notifyAdmins(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const admins = yield (0, db_1.query)(`SELECT id FROM users WHERE role = 'HR_ADMIN'`);
            const adminIds = admins.rows.map((row) => row.id);
            yield this.createForMultipleUsers(adminIds, data);
        });
    }
    // Mark a notification as read
    markAsRead(notificationId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield (0, db_1.query)(`UPDATE notifications
       SET read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`, [notificationId, userId]);
            return ((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0;
        });
    }
    // Mark all notifications as read for a user
    markAllAsRead(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield (0, db_1.query)(`UPDATE notifications
       SET read = TRUE
       WHERE user_id = $1 AND read = FALSE`, [userId]);
            return (_a = result.rowCount) !== null && _a !== void 0 ? _a : 0;
        });
    }
    // Delete a notification
    delete(notificationId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield (0, db_1.query)(`DELETE FROM notifications
       WHERE id = $1 AND user_id = $2`, [notificationId, userId]);
            return ((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0;
        });
    }
    // Delete old notifications (cleanup job)
    deleteOlderThan(days) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield (0, db_1.query)(`DELETE FROM notifications
       WHERE created_at < NOW() - INTERVAL '${days} days'`);
            return (_a = result.rowCount) !== null && _a !== void 0 ? _a : 0;
        });
    }
}
exports.NotificationService = NotificationService;
exports.default = new NotificationService();
