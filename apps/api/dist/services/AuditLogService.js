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
exports.AuditLogService = void 0;
const db_1 = require("../db");
class AuditLogService {
    /**
     * Save audit log entry to database
     */
    create(log) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.query)(`INSERT INTO audit_logs_persistent
         (user_id, user_email, action, resource, method, path, ip, user_agent, status_code, duration, success, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
                    log.userId,
                    log.userEmail,
                    log.action,
                    log.resource,
                    log.method,
                    log.path,
                    log.ip,
                    log.userAgent,
                    log.statusCode,
                    log.duration,
                    log.success,
                    log.details ? JSON.stringify(log.details) : null,
                ]);
            }
            catch (error) {
                // Log error but don't throw - audit logging shouldn't break the request
                console.error("Failed to save audit log:", error);
            }
        });
    }
    /**
     * Get audit logs with pagination and optional filters
     */
    getAll() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            const { limit = 100, offset = 0, userId, action, resource, startDate, endDate } = options;
            let whereClause = "WHERE 1=1";
            const params = [];
            let paramIndex = 1;
            if (userId) {
                whereClause += ` AND user_id = $${paramIndex++}`;
                params.push(userId);
            }
            if (action) {
                whereClause += ` AND action ILIKE $${paramIndex++}`;
                params.push(`%${action}%`);
            }
            if (resource) {
                whereClause += ` AND resource = $${paramIndex++}`;
                params.push(resource);
            }
            if (startDate) {
                whereClause += ` AND created_at >= $${paramIndex++}`;
                params.push(startDate);
            }
            if (endDate) {
                whereClause += ` AND created_at <= $${paramIndex++}`;
                params.push(endDate);
            }
            // Get total count
            const countResult = yield (0, db_1.query)(`SELECT COUNT(*) as total FROM audit_logs_persistent ${whereClause}`, params);
            const total = parseInt(countResult.rows[0].total, 10);
            // Get paginated results
            const result = yield (0, db_1.query)(`SELECT * FROM audit_logs_persistent ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`, [...params, limit, offset]);
            const logs = result.rows.map((row) => ({
                id: row.id,
                userId: row.user_id,
                userEmail: row.user_email,
                action: row.action,
                resource: row.resource,
                method: row.method,
                path: row.path,
                ip: row.ip,
                userAgent: row.user_agent,
                statusCode: row.status_code,
                duration: row.duration,
                success: row.success,
                details: row.details,
                createdAt: row.created_at,
            }));
            return { logs, total };
        });
    }
    /**
     * Get audit logs for a specific user
     */
    getByUserId(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, limit = 50) {
            const { logs } = yield this.getAll({ userId, limit });
            return logs;
        });
    }
    /**
     * Clean up old audit logs (retention policy)
     * Default: keep logs for 90 days
     */
    cleanup() {
        return __awaiter(this, arguments, void 0, function* (retentionDays = 90) {
            const result = yield (0, db_1.query)(`DELETE FROM audit_logs_persistent
       WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
       RETURNING id`);
            return result.rowCount || 0;
        });
    }
}
exports.AuditLogService = AuditLogService;
exports.default = new AuditLogService();
