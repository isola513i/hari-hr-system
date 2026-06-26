import { query } from '../db';
import { BusinessError } from '../utils/errorResponse';
import NotificationService from './NotificationService';
import logger from '../utils/logger';

export interface WFHRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeDepartment?: string;
  employeeAvatar?: string | null;
  date: string;
  reason: string | null;
  status: 'pending' | 'manager_approved' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  managerReviewedBy: string | null;
  managerReviewedAt: string | null;
  createdAt: string;
}

export interface CreateWFHRequestData {
  employeeId: string;
  date: string;
  reason?: string;
}

export class WFHRequestService {
  async create(data: CreateWFHRequestData): Promise<WFHRequest> {
    const { employeeId, date, reason } = data;

    const result = await query(
      `INSERT INTO wfh_requests (employee_id, date, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (employee_id, date) DO UPDATE
         SET reason = EXCLUDED.reason, status = 'pending', updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [employeeId, date, reason ?? null]
    );

    try {
      const empRow = await query(
        `SELECT e.name, u.id AS manager_user_id
         FROM employees e
         LEFT JOIN employees mgr ON mgr.id = e.manager_id
         LEFT JOIN users u ON u.id = mgr.user_id
         WHERE e.id = $1`,
        [employeeId]
      );
      const employeeName = empRow.rows[0]?.name ?? 'An employee';
      const formattedDate = new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

      NotificationService.notifyAdmins({
        title: 'WFH Request Submitted',
        message: `${employeeName} has submitted a WFH request for ${formattedDate}.`,
        type: 'info',
        link: '/admin-attendance',
      }).catch((err) => logger.warn(err, 'Background task failed'));

      if (empRow.rows[0]?.manager_user_id) {
        await NotificationService.create({
          user_id: empRow.rows[0].manager_user_id,
          title: 'WFH Request Needs Your Approval',
          message: `${employeeName} has submitted a WFH request for ${formattedDate}.`,
          type: 'info',
          link: '/admin-attendance',
        });
      }
    } catch (err) {
      logger.error(err, 'Failed to notify about WFH request:');
    }

    return this.mapRow(result.rows[0]);
  }

  async managerApprove(requestId: string, managerEmployeeId: string): Promise<WFHRequest> {
    const reqResult = await query(
      'SELECT employee_id, status, date FROM wfh_requests WHERE id = $1',
      [requestId]
    );
    if (!reqResult.rows[0]) throw new BusinessError('WFH request not found');
    const wfhRow = reqResult.rows[0];

    if (wfhRow.status !== 'pending') {
      throw new BusinessError('WFH request is not in pending state');
    }

    const empResult = await query('SELECT manager_id, name FROM employees WHERE id = $1', [wfhRow.employee_id]);
    if (empResult.rows[0]?.manager_id !== managerEmployeeId) {
      throw new BusinessError('You can only approve requests from your direct reports');
    }

    const result = await query(
      `UPDATE wfh_requests
       SET status = 'manager_approved', manager_reviewed_by = $1, manager_reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [managerEmployeeId, requestId]
    );

    const wfh = this.mapRow(result.rows[0]);

    const empName = (empResult.rows[0] as { name?: string })?.name ?? 'An employee';
    const formattedDate = new Date(wfhRow.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    NotificationService.notifyAdmins({
      title: 'WFH Request Ready for Final Approval',
      message: `Manager approved ${empName}'s WFH request for ${formattedDate}.`,
      type: 'info',
      link: '/admin-attendance',
    }).catch((err) => logger.warn(err, 'Background task failed'));

    return wfh;
  }

  async approve(requestId: string, reviewedById: string): Promise<WFHRequest> {
    const result = await query(
      `UPDATE wfh_requests
       SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [reviewedById, requestId]
    );

    if (result.rows.length === 0) throw new BusinessError('WFH request not found');
    const wfh = this.mapRow(result.rows[0]);
    this.notifyEmployee(wfh.employeeId, wfh.date, 'approved');
    return wfh;
  }

  async reject(requestId: string, reviewedById: string): Promise<WFHRequest> {
    const result = await query(
      `UPDATE wfh_requests
       SET status = 'rejected', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [reviewedById, requestId]
    );

    if (result.rows.length === 0) throw new BusinessError('WFH request not found');
    const wfh = this.mapRow(result.rows[0]);
    this.notifyEmployee(wfh.employeeId, wfh.date, 'rejected');
    return wfh;
  }

  private notifyEmployee(employeeId: string, date: string, status: 'approved' | 'rejected'): void {
    query('SELECT user_id FROM employees WHERE id = $1', [employeeId])
      .then(({ rows }) => {
        if (!rows[0]?.user_id) return;
        const formattedDate = new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
        return NotificationService.create({
          user_id: rows[0].user_id,
          title: `WFH Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          message: `Your WFH request for ${formattedDate} has been ${status}.`,
          type: status === 'approved' ? 'success' : 'warning',
          link: '/check-in',
        });
      })
      .catch((err) => logger.error(err, 'Failed to notify employee about WFH status:'));
  }

  async getMyRequests(employeeId: string): Promise<WFHRequest[]> {
    const result = await query(
      `SELECT id, employee_id, date, reason, status, reviewed_by, reviewed_at, manager_reviewed_by, manager_reviewed_at, created_at
       FROM wfh_requests WHERE employee_id = $1 ORDER BY date DESC`,
      [employeeId]
    );

    return result.rows.map(this.mapRow);
  }

  async getAll(filters: { status?: string; date?: string; myTeam?: boolean; callerEmployeeId?: string } = {}): Promise<WFHRequest[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (filters.status) {
      conditions.push(`wr.status = $${i++}`);
      params.push(filters.status);
    }
    if (filters.date) {
      conditions.push(`wr.date = $${i++}`);
      params.push(filters.date);
    }
    if (filters.myTeam && filters.callerEmployeeId) {
      conditions.push(`e.manager_id = $${i++}`);
      params.push(filters.callerEmployeeId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT wr.*, e.name AS employee_name, e.department AS employee_department, e.avatar AS employee_avatar
       FROM wfh_requests wr
       JOIN employees e ON wr.employee_id = e.id
       ${where}
       ORDER BY wr.date DESC, wr.created_at DESC`,
      params
    );

    return result.rows.map((row) => ({
      ...this.mapRow(row),
      employeeName: row.employee_name,
      employeeDepartment: row.employee_department,
      employeeAvatar: row.employee_avatar,
    }));
  }

  async hasApprovedWFH(employeeId: string, date: string): Promise<boolean> {
    const result = await query(
      `SELECT 1 FROM wfh_requests WHERE employee_id = $1 AND date = $2 AND status = 'approved'`,
      [employeeId, date]
    );

    return result.rows.length > 0;
  }

  private mapRow(row: Record<string, unknown>): WFHRequest {
    return {
      id: row.id as string,
      employeeId: row.employee_id as string,
      date: row.date as string,
      reason: row.reason as string | null,
      status: row.status as WFHRequest['status'],
      reviewedBy: row.reviewed_by as string | null,
      reviewedAt: row.reviewed_at as string | null,
      managerReviewedBy: row.manager_reviewed_by as string | null,
      managerReviewedAt: row.manager_reviewed_at as string | null,
      createdAt: row.created_at as string,
    };
  }
}

export default new WFHRequestService();
