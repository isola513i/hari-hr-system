import { Request, Response, NextFunction } from 'express';

export interface AuditLog {
    timestamp: string;
    userId: string | null;
    userEmail: string | null;
    action: string;
    resource: string;
    method: string;
    path: string;
    ip: string;
    userAgent: string;
    statusCode?: number;
    details?: any;
}

// In-memory audit log store (in production, this should be stored in database)
const auditLogs: AuditLog[] = [];

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
    'DELETE /api/leave-requests',
];

export const auditLogMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.json;

    // Override res.json to capture response
    res.json = function (data: any) {
        const routeKey = `${req.method} ${req.path}`;

        // Check if this route should be audited
        const shouldAudit = auditableActions.some(route => {
            const [method, path] = route.split(' ');
            return req.method === method && req.path.startsWith(path);
        });

        if (shouldAudit) {
            const log: AuditLog = {
                timestamp: new Date().toISOString(),
                userId: (req as any).user?.userId || null,
                userEmail: (req as any).user?.email || null,
                action: getActionDescription(req.method, req.path),
                resource: getResourceName(req.path),
                method: req.method,
                path: req.path,
                ip: req.ip || req.socket.remoteAddress || 'unknown',
                userAgent: req.get('user-agent') || 'unknown',
                statusCode: res.statusCode,
                details: {
                    duration: Date.now() - startTime,
                    body: sanitizeBody(req.body),
                    success: res.statusCode < 400,
                }
            };

            auditLogs.push(log);

            // Keep only last 1000 logs in memory (or configure based on needs)
            if (auditLogs.length > 1000) {
                auditLogs.shift();
            }

            // Log to console for development
            console.log('[AUDIT]', {
                action: log.action,
                user: log.userEmail || 'Anonymous',
                resource: log.resource,
                status: log.statusCode,
                ip: log.ip
            });
        }

        return originalSend.call(this, data);
    };

    next();
};

// Helper to get human-readable action description
function getActionDescription(method: string, path: string): string {
    if (path.includes('/login')) return 'User Login';
    if (path.includes('/logout')) return 'User Logout';
    if (path.includes('/change-password')) return 'Password Change';

    if (path.includes('/employees')) {
        if (method === 'POST') return 'Employee Created';
        if (method === 'PUT') return 'Employee Updated';
        if (method === 'DELETE') return 'Employee Deleted';
    }

    if (path.includes('/documents')) {
        if (method === 'POST') return 'Document Uploaded';
        if (method === 'DELETE') return 'Document Deleted';
    }

    if (path.includes('/leave-requests')) {
        if (method === 'POST') return 'Leave Request Created';
        if (method === 'PUT') return 'Leave Request Updated';
        if (method === 'DELETE') return 'Leave Request Deleted';
    }

    return `${method} ${path}`;
}

// Helper to get resource name from path
function getResourceName(path: string): string {
    if (path.includes('/employees')) return 'Employee';
    if (path.includes('/documents')) return 'Document';
    if (path.includes('/leave-requests')) return 'Leave Request';
    if (path.includes('/auth')) return 'Authentication';
    return 'Unknown';
}

// Helper to sanitize sensitive data from body
function sanitizeBody(body: any): any {
    if (!body) return {};

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token'];
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '***REDACTED***';
        }
    });

    return sanitized;
}

// Export function to get audit logs (for API endpoint)
export function getAuditLogs(limit: number = 100): AuditLog[] {
    return auditLogs.slice(-limit).reverse();
}

// Export function to get audit logs for specific user
export function getUserAuditLogs(userId: string, limit: number = 50): AuditLog[] {
    return auditLogs
        .filter(log => log.userId === userId)
        .slice(-limit)
        .reverse();
}
