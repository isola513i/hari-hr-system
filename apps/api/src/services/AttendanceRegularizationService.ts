import { query } from '../db';
import { BusinessError } from '../utils/errorResponse';
import { withTransaction } from '../utils/transaction';
import NotificationService from './NotificationService';
import AttendanceService from './AttendanceService';
import logger from '../utils/logger';

export interface RegularizationRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeDepartment?: string;
  employeeAvatar?: string | null;
  date: string;
  requestedClockIn: string | null;
  requestedClockOut: string | null;
  reason: string;
  status: 'pending' | 'manager_approved' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  managerReviewedBy: string | null;
  managerReviewedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateRegularizationData {
  date: string;
  requestedClockIn?: string;
  requestedClockOut?: string;
  reason: string;
}

const formatDate = (date: string): string =>
  new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export class AttendanceRegularizationService {
  /**
   * Employee submits a correction request for a given date.
   * Re-submitting for the same date resets a prior request back to 'pending'.
   */
  async create(employeeId: string, data: CreateRegularizationData): Promise<RegularizationRequest> {
    const { date, requestedClockIn, requestedClockOut, reason } = data;

    if (!reason || !reason.trim()) {
      throw new BusinessError('A reason is required');
    }
    if (!requestedClockIn && !requestedClockOut) {
      throw new BusinessError('Provide at least a corrected clock-in or clock-out time');
    }
    // Regularization is for past/known dates — reject future dates
    if (new Date(date) > new Date(new Date().toISOString().slice(0, 10) + 'T23:59:59Z')) {
      throw new BusinessError('Cannot request a correction for a future date');
    }

    const result = await query(
      `INSERT INTO attendance_regularization_requests
         (employee_id, date, requested_clock_in, requested_clock_out, reason)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (employee_id, date) DO UPDATE
         SET requested_clock_in = EXCLUDED.requested_clock_in,
             requested_clock_out = EXCLUDED.requested_clock_out,
             reason = EXCLUDED.reason,
             status = 'pending',
             manager_reviewed_by = NULL,
             manager_reviewed_at = NULL,
             reviewed_by = NULL,
             reviewed_at = NULL,
             notes = NULL,
             updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [employeeId, date, requestedClockIn ?? null, requestedClockOut ?? null, reason.trim()]
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

      NotificationService.notifyAdmins({
        title: 'Attendance Correction Request',
        message: `${employeeName} requested an attendance correction for ${formatDate(date)}.`,
        type: 'info',
        link: '/requests?tab=attendance_reg',
      }).catch(() => {});

      if (empRow.rows[0]?.manager_user_id) {
        await NotificationService.create({
          user_id: empRow.rows[0].manager_user_id,
          title: 'Attendance Correction Needs Your Approval',
          message: `${employeeName} requested an attendance correction for ${formatDate(date)}.`,
          type: 'info',
          link: '/requests?tab=attendance_reg',
        });
      }
    } catch (err) {
      logger.error(err, 'Failed to notify about attendance regularization request:');
    }

    return this.mapRow(result.rows[0]);
  }

  async getByEmployee(employeeId: string, filters: { status?: string } = {}): Promise<RegularizationRequest[]> {
    const conditions = ['employee_id = $1'];
    const params: unknown[] = [employeeId];
    let i = 2;

    if (filters.status) {
      conditions.push(`status = $${i++}`);
      params.push(filters.status);
    }

    const result = await query(
      `SELECT id, employee_id, date, requested_clock_in, requested_clock_out, reason, status,
              manager_reviewed_by, manager_reviewed_at, reviewed_by, reviewed_at, notes, created_at
       FROM attendance_regularization_requests
       WHERE ${conditions.join(' AND ')}
       ORDER BY date DESC, created_at DESC`,
      params
    );
    return result.rows.map(this.mapRow);
  }

  async getAll(filters: { status?: string; date?: string; myTeam?: boolean; callerEmployeeId?: string } = {}): Promise<RegularizationRequest[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (filters.status) {
      conditions.push(`rr.status = $${i++}`);
      params.push(filters.status);
    }
    if (filters.date) {
      conditions.push(`rr.date = $${i++}`);
      params.push(filters.date);
    }
    if (filters.myTeam && filters.callerEmployeeId) {
      conditions.push(`e.manager_id = $${i++}`);
      params.push(filters.callerEmployeeId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT rr.*, e.name AS employee_name, e.department AS employee_department, e.avatar AS employee_avatar
       FROM attendance_regularization_requests rr
       JOIN employees e ON rr.employee_id = e.id
       ${where}
       ORDER BY rr.date DESC, rr.created_at DESC`,
      params
    );

    return result.rows.map((row) => ({
      ...this.mapRow(row),
      employeeName: row.employee_name,
      employeeDepartment: row.employee_department,
      employeeAvatar: row.employee_avatar,
    }));
  }

  async managerApprove(requestId: string, managerEmployeeId: string): Promise<RegularizationRequest> {
    const reqResult = await query(
      'SELECT employee_id, status, date FROM attendance_regularization_requests WHERE id = $1',
      [requestId]
    );
    if (!reqResult.rows[0]) throw new BusinessError('Regularization request not found');
    const reqRow = reqResult.rows[0];

    if (reqRow.status !== 'pending') {
      throw new BusinessError('Regularization request is not in pending state');
    }

    const empResult = await query('SELECT manager_id, name FROM employees WHERE id = $1', [reqRow.employee_id]);
    if (empResult.rows[0]?.manager_id !== managerEmployeeId) {
      throw new BusinessError('You can only approve requests from your direct reports');
    }

    const result = await query(
      `UPDATE attendance_regularization_requests
       SET status = 'manager_approved', manager_reviewed_by = $1, manager_reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [managerEmployeeId, requestId]
    );

    const reg = this.mapRow(result.rows[0]);
    const empName = (empResult.rows[0] as { name?: string })?.name ?? 'An employee';
    NotificationService.notifyAdmins({
      title: 'Attendance Correction Ready for Final Approval',
      message: `Manager approved ${empName}'s attendance correction for ${formatDate(reqRow.date)}.`,
      type: 'info',
      link: '/requests?tab=attendance_reg',
    }).catch(() => {});

    return reg;
  }

  /**
   * HR admin gives final approval. Applies the requested times to attendance_records
   * via the existing adminUpsertAttendance flow.
   *
   * @param reviewerId     the reviewer's EMPLOYEE id — stored in reviewed_by (FK → employees)
   * @param reviewerUserId the reviewer's USER id — passed to attendance.modified_by (FK → users)
   */
  async approve(requestId: string, reviewerId: string, reviewerUserId: string, notes?: string): Promise<RegularizationRequest> {
    // Atomic: the status flip and the attendance write commit (or roll back) together,
    // so an approved request can never be left without its correction applied.
    const reg = await withTransaction(async (txQuery) => {
      const result = await txQuery(
        `UPDATE attendance_regularization_requests
         SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP,
             notes = COALESCE($2, notes), updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [reviewerId, notes ?? null, requestId]
      );
      if (result.rows.length === 0) throw new BusinessError('Regularization request not found');
      const r = this.mapRow(result.rows[0]);

      // Apply the correction to the attendance record on the SAME transaction.
      // modified_by is a FK to users(id), so we pass the reviewer's USER id (not employee id).
      await AttendanceService.adminUpsertAttendance(
        {
          employeeId: r.employeeId,
          date: r.date,
          clockIn: r.requestedClockIn ?? undefined,
          clockOut: r.requestedClockOut ?? undefined,
          notes: `Regularization #${r.id}`,
          modifiedBy: reviewerUserId,
        },
        txQuery
      );
      return r;
    });

    // Notify only after the transaction has committed.
    this.notifyEmployee(reg.employeeId, reg.date, 'approved');
    return reg;
  }

  async reject(requestId: string, reviewerId: string, notes?: string): Promise<RegularizationRequest> {
    const result = await query(
      `UPDATE attendance_regularization_requests
       SET status = 'rejected', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP,
           notes = COALESCE($2, notes), updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [reviewerId, notes ?? null, requestId]
    );
    if (result.rows.length === 0) throw new BusinessError('Regularization request not found');
    const reg = this.mapRow(result.rows[0]);
    this.notifyEmployee(reg.employeeId, reg.date, 'rejected');
    return reg;
  }

  async cancel(requestId: string, employeeId: string): Promise<void> {
    const result = await query(
      `DELETE FROM attendance_regularization_requests
       WHERE id = $1 AND employee_id = $2 AND status = 'pending'`,
      [requestId, employeeId]
    );
    if (result.rowCount === 0) {
      throw new BusinessError('Request not found or no longer cancellable');
    }
  }

  private notifyEmployee(employeeId: string, date: string, status: 'approved' | 'rejected'): void {
    query('SELECT user_id FROM employees WHERE id = $1', [employeeId])
      .then(({ rows }) => {
        if (!rows[0]?.user_id) return;
        return NotificationService.create({
          user_id: rows[0].user_id,
          title: `Attendance Correction ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          message: `Your attendance correction for ${formatDate(date)} has been ${status}.`,
          type: status === 'approved' ? 'success' : 'warning',
          link: '/attendance',
        });
      })
      .catch((err) => logger.error(err, 'Failed to notify employee about regularization status:'));
  }

  private mapRow(row: Record<string, unknown>): RegularizationRequest {
    return {
      id: row.id as string,
      employeeId: row.employee_id as string,
      date: row.date as string,
      requestedClockIn: row.requested_clock_in as string | null,
      requestedClockOut: row.requested_clock_out as string | null,
      reason: row.reason as string,
      status: row.status as RegularizationRequest['status'],
      reviewedBy: row.reviewed_by as string | null,
      reviewedAt: row.reviewed_at as string | null,
      managerReviewedBy: row.manager_reviewed_by as string | null,
      managerReviewedAt: row.manager_reviewed_at as string | null,
      notes: row.notes as string | null,
      createdAt: row.created_at as string,
    };
  }
}

export default new AttendanceRegularizationService();
