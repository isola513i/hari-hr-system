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
exports.auditLogMiddleware = void 0;
exports.getAuditLogs = getAuditLogs;
exports.getUserAuditLogs = getUserAuditLogs;
exports.getAuditLogsFromDb = getAuditLogsFromDb;
const AuditLogService_1 = __importDefault(require("../services/AuditLogService"));
// In-memory cache for recent logs (for quick access, with DB persistence)
const recentLogs = [];
const MAX_RECENT_LOGS = 100;
// Actions that should be audited
const auditableActions = [
    'POST /api/auth/login',
    'POST /api/auth/logout',
    'POST /api/auth/change-password',
    'POST /api/employees',
    'PUT /api/employees',
    'DELETE /api/employees',
    'POST /api/documents',
    'DELETE /api/documents',
    'POST /api/leave-requests',
    'PUT /api/leave-requests',
    'PATCH /api/leave-requests',
    'DELETE /api/leave-requests',
    'POST /api/system/seed',
];
const auditLogMiddleware = (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.json;
    // Override res.json to capture response
    res.json = function (data) {
        var _a, _b;
        // Check if this route should be audited
        const shouldAudit = auditableActions.some(route => {
            const [method, path] = route.split(' ');
            return req.method === method && req.path.startsWith(path);
        });
        if (shouldAudit) {
            const duration = Date.now() - startTime;
            const log = {
                timestamp: new Date().toISOString(),
                userId: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId) || null,
                userEmail: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email) || null,
                action: getActionDescription(req.method, req.path),
                resource: getResourceName(req.path),
                method: req.method,
                path: req.path,
                ip: req.ip || req.socket.remoteAddress || 'unknown',
                userAgent: req.get('user-agent') || 'unknown',
                statusCode: res.statusCode,
                details: {
                    duration,
                    body: sanitizeBody(req.body),
                    success: res.statusCode < 400,
                }
            };
            // Add to in-memory cache for quick access
            recentLogs.push(log);
            if (recentLogs.length > MAX_RECENT_LOGS) {
                recentLogs.shift();
            }
            // Persist to database (async, non-blocking)
            AuditLogService_1.default.create({
                userId: log.userId,
                userEmail: log.userEmail,
                action: log.action,
                resource: log.resource,
                method: log.method,
                path: log.path,
                ip: log.ip,
                userAgent: log.userAgent,
                statusCode: log.statusCode,
                duration,
                success: res.statusCode < 400,
                details: log.details,
            }).catch(err => {
                console.error('[AUDIT] Failed to persist log:', err);
            });
            // Log to console for development
            if (process.env.NODE_ENV !== 'production') {
                console.log('[AUDIT]', {
                    action: log.action,
                    user: log.userEmail || 'Anonymous',
                    resource: log.resource,
                    status: log.statusCode,
                    duration: `${duration}ms`,
                    ip: log.ip
                });
            }
        }
        return originalSend.call(this, data);
    };
    next();
};
exports.auditLogMiddleware = auditLogMiddleware;
// Helper to get human-readable action description
function getActionDescription(method, path) {
    if (path.includes('/login'))
        return 'User Login';
    if (path.includes('/logout'))
        return 'User Logout';
    if (path.includes('/change-password'))
        return 'Password Change';
    if (path.includes('/system/seed'))
        return 'Database Seed';
    if (path.includes('/employees')) {
        if (method === 'POST')
            return 'Employee Created';
        if (method === 'PUT')
            return 'Employee Updated';
        if (method === 'DELETE')
            return 'Employee Deleted';
    }
    if (path.includes('/documents')) {
        if (method === 'POST')
            return 'Document Uploaded';
        if (method === 'DELETE')
            return 'Document Deleted';
    }
    if (path.includes('/leave-requests')) {
        if (method === 'POST')
            return 'Leave Request Created';
        if (method === 'PUT' || method === 'PATCH')
            return 'Leave Request Updated';
        if (method === 'DELETE')
            return 'Leave Request Deleted';
    }
    return `${method} ${path}`;
}
// Helper to get resource name from path
function getResourceName(path) {
    if (path.includes('/employees'))
        return 'Employee';
    if (path.includes('/documents'))
        return 'Document';
    if (path.includes('/leave-requests'))
        return 'Leave Request';
    if (path.includes('/auth'))
        return 'Authentication';
    if (path.includes('/system'))
        return 'System';
    return 'Unknown';
}
// Helper to sanitize sensitive data from body
function sanitizeBody(body) {
    if (!body)
        return {};
    const sanitized = Object.assign({}, body);
    // Remove sensitive fields
    const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token', 'password_hash'];
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '***REDACTED***';
        }
    });
    return sanitized;
}
// Export function to get recent audit logs from memory cache (for quick access)
function getAuditLogs(limit = 100) {
    return recentLogs.slice(-limit).reverse();
}
// Export function to get audit logs for specific user from memory cache
function getUserAuditLogs(userId, limit = 50) {
    return recentLogs
        .filter(log => log.userId === userId)
        .slice(-limit)
        .reverse();
}
// Export function to get audit logs from database (for comprehensive history)
function getAuditLogsFromDb() {
    return __awaiter(this, arguments, void 0, function* (options = {}) {
        return AuditLogService_1.default.getAll(options);
    });
}
