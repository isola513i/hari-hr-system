import { query } from '../db';
import NotificationService from './NotificationService';

export interface OTRequest {
  id: string;
  employeeId: string;
  date: string;
  plannedStart: string;
  plannedEnd: string;
  plannedHours: number;
  actualHours: number | null;
  otType: 'regular' | 'holiday';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // joined fields
  employeeName?: string;
  employeeAvatar?: string;
  department?: string;
  reviewerName?: string;
}

export interface CreateOTRequestData {
  date: string;
  plannedStart: string;
  plannedEnd: string;
  plannedHours: number;
  otType?: 'regular' | 'holiday';
  reason: string;
}

function mapRow(row: any): OTRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date),
    plannedStart: row.planned_start,
    plannedEnd: row.planned_end,
    plannedHours: parseFloat(row.planned_hours),
    actualHours: row.actual_hours != null ? parseFloat(row.actual_hours) : null,
    otType: row.ot_type,
    reason: row.reason,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    employeeName: row.employee_name,
    employeeAvatar: row.employee_avatar,
    department: row.department,
    reviewerName: row.reviewer_name,
  };
}

const BASE_SELECT = `
  SELECT
    ot.*,
    e.name AS employee_name,
    e.avatar AS employee_avatar,
    e.department,
    r.name AS reviewer_name
  FROM ot_requests ot
  JOIN employees e ON e.id = ot.employee_id
  LEFT JOIN employees r ON r.id = ot.reviewed_by
`;

class OTRequestService {
  async create(employeeId: string, data: CreateOTRequestData): Promise<OTRequest> {
    if (data.plannedHours <= 0 || data.plannedHours > 24) {
      throw new Error('Planned hours must be between 0 and 24');
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    if (new Date(data.date) < sevenDaysAgo) {
      throw new Error('Cannot request OT for dates more than 7 days in the past');
    }

    const result = await query(
      `INSERT INTO ot_requests (employee_id, date, planned_start, planned_end, planned_hours, ot_type, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [employeeId, data.date, data.plannedStart, data.plannedEnd, data.plannedHours, data.otType || 'regular', data.reason]
    );

    const ot = result.rows[0];

    // Notify HR admins
    const empResult = await query('SELECT name FROM employees WHERE id = $1', [employeeId]);
    const empName = empResult.rows[0]?.name || 'An employee';
    NotificationService.notifyAdmins({
      title: 'New OT Request',
      message: `${empName} has requested ${data.plannedHours}h OT on ${data.date}`,
      type: 'info',
      link: '/admin/attendance',
    }).catch(() => {});

    return mapRow(ot);
  }

  async getByEmployee(employeeId: string, filters?: { status?: string; month?: string }): Promise<OTRequest[]> {
    let sql = `${BASE_SELECT} WHERE ot.employee_id = $1`;
    const params: any[] = [employeeId];

    if (filters?.status && filters.status !== 'all') {
      params.push(filters.status);
      sql += ` AND ot.status = $${params.length}`;
    }
    if (filters?.month) {
      params.push(filters.month);
      sql += ` AND TO_CHAR(ot.date, 'YYYY-MM') = $${params.length}`;
    }

    sql += ' ORDER BY ot.date DESC';
    const result = await query(sql, params);
    return result.rows.map(mapRow);
  }

  async getAll(filters?: { status?: string; employeeName?: string; month?: string; department?: string }): Promise<OTRequest[]> {
    let sql = `${BASE_SELECT} WHERE 1=1`;
    const params: any[] = [];

    if (filters?.status && filters.status !== 'all') {
      params.push(filters.status);
      sql += ` AND ot.status = $${params.length}`;
    }
    if (filters?.employeeName) {
      params.push(`%${filters.employeeName}%`);
      sql += ` AND e.name ILIKE $${params.length}`;
    }
    if (filters?.month) {
      params.push(filters.month);
      sql += ` AND TO_CHAR(ot.date, 'YYYY-MM') = $${params.length}`;
    }
    if (filters?.department) {
      params.push(filters.department);
      sql += ` AND e.department = $${params.length}`;
    }

    sql += ' ORDER BY ot.created_at DESC';
    const result = await query(sql, params);
    return result.rows.map(mapRow);
  }

  async approve(id: string, reviewerId: string, notes?: string): Promise<OTRequest> {
    const result = await query(
      `UPDATE ot_requests
       SET status = 'approved', reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP,
           notes = COALESCE($3, notes), updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, reviewerId, notes || null]
    );
    if (!result.rows[0]) throw new Error('OT request not found or already reviewed');

    const ot = result.rows[0];

    // Notify employee
    await this.notifyEmployee(ot.employee_id, {
      title: 'OT Request Approved',
      message: `Your OT request for ${ot.date} has been approved`,
      type: 'success',
      link: '/dashboard',
    });

    // Sync actual_hours from attendance if date has passed
    await this.syncActualHoursForRequest(ot.id, ot.employee_id, ot.date).catch(() => {});

    return mapRow(ot);
  }

  async reject(id: string, reviewerId: string, notes?: string): Promise<OTRequest> {
    const result = await query(
      `UPDATE ot_requests
       SET status = 'rejected', reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP,
           notes = COALESCE($3, notes), updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, reviewerId, notes || null]
    );
    if (!result.rows[0]) throw new Error('OT request not found or already reviewed');

    const ot = result.rows[0];
    await this.notifyEmployee(ot.employee_id, {
      title: 'OT Request Rejected',
      message: `Your OT request for ${ot.date} has been rejected${notes ? `: ${notes}` : ''}`,
      type: 'warning',
      link: '/dashboard',
    });

    return mapRow(ot);
  }

  async cancel(id: string, employeeId: string): Promise<void> {
    const result = await query(
      `DELETE FROM ot_requests WHERE id = $1 AND employee_id = $2 AND status = 'pending' RETURNING id`,
      [id, employeeId]
    );
    if (!result.rows[0]) throw new Error('OT request not found or cannot be cancelled');
  }

  async getStats(month?: string): Promise<{
    pending: number;
    approvedThisMonth: number;
    totalOTHoursThisMonth: number;
    topEmployees: { employeeId: string; name: string; hours: number }[];
  }> {
    const m = month || new Date().toISOString().slice(0, 7);

    const [pendingRes, approvedRes, topRes] = await Promise.all([
      query(`SELECT COUNT(*) AS count FROM ot_requests WHERE status = 'pending'`),
      query(
        `SELECT COUNT(*) AS count, COALESCE(SUM(COALESCE(actual_hours, planned_hours)), 0) AS total_hours
         FROM ot_requests WHERE status = 'approved' AND TO_CHAR(date, 'YYYY-MM') = $1`,
        [m]
      ),
      query(
        `SELECT ot.employee_id, e.name, SUM(COALESCE(ot.actual_hours, ot.planned_hours)) AS hours
         FROM ot_requests ot JOIN employees e ON e.id = ot.employee_id
         WHERE ot.status = 'approved' AND TO_CHAR(ot.date, 'YYYY-MM') = $1
         GROUP BY ot.employee_id, e.name ORDER BY hours DESC LIMIT 5`,
        [m]
      ),
    ]);

    return {
      pending: parseInt(pendingRes.rows[0].count, 10),
      approvedThisMonth: parseInt(approvedRes.rows[0].count, 10),
      totalOTHoursThisMonth: parseFloat(approvedRes.rows[0].total_hours),
      topEmployees: topRes.rows.map((r: any) => ({
        employeeId: r.employee_id,
        name: r.name,
        hours: parseFloat(r.hours),
      })),
    };
  }

  // Sum approved OT hours for payroll calculation
  async getApprovedOTHours(employeeId: string, periodStart: string, periodEnd: string): Promise<number> {
    const result = await query(
      `SELECT COALESCE(SUM(COALESCE(actual_hours, planned_hours)), 0) AS total
       FROM ot_requests
       WHERE employee_id = $1 AND status = 'approved' AND date >= $2 AND date <= $3`,
      [employeeId, periodStart, periodEnd]
    );
    return parseFloat(result.rows[0].total);
  }

  // Sync actual_hours from attendance_records for a specific OT request
  private async syncActualHoursForRequest(id: string, employeeId: string, date: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    if (date >= today) return; // Only sync past dates

    await query(
      `UPDATE ot_requests ot
       SET actual_hours = ar.overtime_hours, updated_at = CURRENT_TIMESTAMP
       FROM attendance_records ar
       WHERE ot.id = $1
         AND ar.employee_id = $2
         AND ar.date = $3::date
         AND ar.overtime_hours IS NOT NULL
         AND ar.overtime_hours > 0`,
      [id, employeeId, date]
    );
  }

  // Batch sync actual_hours for all approved past OT requests without actual_hours
  async syncAllActualHours(): Promise<void> {
    await query(`
      UPDATE ot_requests ot
      SET actual_hours = ar.overtime_hours, updated_at = CURRENT_TIMESTAMP
      FROM attendance_records ar
      WHERE ot.employee_id = ar.employee_id
        AND ot.date = ar.date
        AND ot.status = 'approved'
        AND ot.actual_hours IS NULL
        AND ar.overtime_hours IS NOT NULL
        AND ar.overtime_hours > 0
        AND ot.date < CURRENT_DATE
    `);
  }

  private async notifyEmployee(employeeId: string, data: { title: string; message: string; type: string; link?: string }): Promise<void> {
    const userResult = await query('SELECT id FROM users WHERE id = (SELECT user_id FROM employees WHERE id = $1)', [employeeId]).catch(() => ({ rows: [] }));
    // Find user via employee
    const userRes = await query(
      `SELECT u.id FROM users u JOIN employees e ON e.user_id = u.id WHERE e.id = $1`,
      [employeeId]
    ).catch(() => ({ rows: [] }));
    if (userRes.rows[0]) {
      await NotificationService.create({
        user_id: userRes.rows[0].id,
        title: data.title,
        message: data.message,
        type: data.type as any,
        link: data.link,
      }).catch(() => {});
    }
  }
}

export default new OTRequestService();
