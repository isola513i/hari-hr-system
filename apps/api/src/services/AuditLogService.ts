import { query } from "../db";

export interface AuditLogEntry {
  id?: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resource: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  statusCode?: number;
  duration?: number;
  success?: boolean;
  details?: Record<string, unknown>;
  createdAt?: Date;
}

export class AuditLogService {
  /**
   * Save audit log entry to database
   */
  async create(log: AuditLogEntry): Promise<void> {
    try {
      await query(
        `INSERT INTO audit_logs_persistent
         (user_id, user_email, action, resource, method, path, ip, user_agent, status_code, duration, success, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
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
        ]
      );
    } catch (error) {
      // Log error but don't throw - audit logging shouldn't break the request
      console.error("Failed to save audit log:", error);
    }
  }

  /**
   * Get audit logs with pagination and optional filters
   */
  async getAll(options: {
    limit?: number;
    offset?: number;
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{ logs: AuditLogEntry[]; total: number }> {
    const { limit = 100, offset = 0, userId, action, resource, startDate, endDate } = options;

    let whereClause = "WHERE 1=1";
    const params: unknown[] = [];
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
    const countResult = await query(
      `SELECT COUNT(*) as total FROM audit_logs_persistent ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results
    const result = await query(
      `SELECT * FROM audit_logs_persistent ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    const logs: AuditLogEntry[] = result.rows.map((row) => ({
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
  }

  /**
   * Get audit logs for a specific user
   */
  async getByUserId(userId: string, limit: number = 50): Promise<AuditLogEntry[]> {
    const { logs } = await this.getAll({ userId, limit });
    return logs;
  }

  /**
   * Clean up old audit logs (retention policy)
   * Default: keep logs for 90 days
   */
  async cleanup(retentionDays: number = 90): Promise<number> {
    const result = await query(
      `DELETE FROM audit_logs_persistent
       WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
       RETURNING id`
    );
    return result.rowCount || 0;
  }
}

export default new AuditLogService();
