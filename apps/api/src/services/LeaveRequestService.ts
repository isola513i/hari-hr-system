import { query } from '../db';
import { LeaveRequest, CreateLeaveRequestDTO, UpdateLeaveRequestDTO, EditLeaveRequestDTO } from '../models/LeaveRequest';
import SystemConfigService from './SystemConfigService';
import EmployeeLeaveQuotaService from './EmployeeLeaveQuotaService';
import NotificationService from './NotificationService';
import HolidayService from './HolidayService';
import { withTransaction } from '../utils/transaction';
import { PaginationParams, PaginatedResult, createPaginatedResult, buildPaginationClause, buildSortClause } from '../utils/pagination';

// Leave type constants — avoid hardcoded strings throughout the service
const LEAVE_TYPE_SICK = 'Sick Leave';
const LEAVE_TYPE_MATERNITY = 'Maternity Leave';

/** Convert a pg DATE value to a plain YYYY-MM-DD string to avoid timezone shifts */
function toDateString(val: unknown): string {
    if (!val) return '';
    if (val instanceof Date) {
        return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`;
    }
    return String(val);
}

const BASE_SELECT = `
    SELECT lr.*, e.avatar, e.name as employee_name,
           COALESCE(lr.business_days, (lr.end_date::date - lr.start_date::date) + 1) as days,
           TO_CHAR(lr.start_date, 'Mon DD') || ' - ' || TO_CHAR(lr.end_date, 'Mon DD') as dates,
           he.name as handover_employee_name,
           lr.is_half_day, lr.half_day_period
    FROM leave_requests lr
    LEFT JOIN employees e ON lr.employee_id = e.id
    LEFT JOIN employees he ON lr.handover_employee_id = he.id
    WHERE lr.deleted_at IS NULL`;

export class LeaveRequestService {
    static async calculateBusinessDays(startDate: string, endDate: string): Promise<number> {
        const holidayDates = await HolidayService.getHolidayDatesSet(startDate, endDate);
        const start = new Date(startDate);
        const end = new Date(endDate);
        let count = 0;
        const current = new Date(start);
        while (current <= end) {
            const dayOfWeek = current.getDay();
            const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
                count++;
            }
            current.setDate(current.getDate() + 1);
        }
        return count;
    }

    static stripSensitiveLeaveFields(request: LeaveRequest): LeaveRequest {
        return {
            ...request,
            type: 'Leave',
            reason: undefined,
            medicalCertificatePath: undefined,
            handoverNotes: undefined,
            rejectionReason: undefined,
        };
    }

    async getAllLeaveRequests(): Promise<LeaveRequest[]> {
        const result = await query(`
            ${BASE_SELECT}
            ORDER BY lr.created_at DESC
        `);
        // BASE_SELECT already filters deleted_at IS NULL
        return result.rows.map(this.mapRowToLeaveRequest);
    }

    async getLeaveRequestsPaginated(
        paginationParams: PaginationParams,
        filters: { status?: string; employeeId?: string; type?: string },
        sortField: string = 'created_at',
        sortOrder: 'ASC' | 'DESC' = 'DESC'
    ): Promise<PaginatedResult<LeaveRequest>> {
        const whereClauses: string[] = [];
        const params: any[] = [];
        let paramCount = 0;

        // Always exclude soft-deleted records
        whereClauses.push('lr.deleted_at IS NULL');

        if (filters.status) {
            paramCount++;
            whereClauses.push(`lr.status = $${paramCount}`);
            params.push(filters.status);
        }

        if (filters.employeeId) {
            paramCount++;
            whereClauses.push(`lr.employee_id = $${paramCount}`);
            params.push(filters.employeeId);
        }

        if (filters.type) {
            paramCount++;
            whereClauses.push(`lr.leave_type = $${paramCount}`);
            params.push(filters.type);
        }

        const whereClause = `WHERE ${whereClauses.join(' AND ')}`;

        const fieldMapping: Record<string, string> = {
            'created_at': 'lr.created_at',
            'start_date': 'lr.start_date',
            'end_date': 'lr.end_date',
            'status': 'lr.status',
            'type': 'lr.leave_type',
        };

        const countResult = await query(
            `SELECT COUNT(*) as total
             FROM leave_requests lr
             ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].total);

        const sortClause = buildSortClause(sortField, sortOrder, fieldMapping);
        const paginationClause = buildPaginationClause(paginationParams);

        const result = await query(
            `SELECT lr.*, e.avatar, e.name as employee_name,
                    (lr.end_date::date - lr.start_date::date) + 1 as days,
                    TO_CHAR(lr.start_date, 'Mon DD') || ' - ' || TO_CHAR(lr.end_date, 'Mon DD') as dates,
                    he.name as handover_employee_name
             FROM leave_requests lr
             LEFT JOIN employees e ON lr.employee_id = e.id
             LEFT JOIN employees he ON lr.handover_employee_id = he.id
             ${whereClause}
             ${sortClause}
             ${paginationClause}`,
            params
        );

        const data = result.rows.map(this.mapRowToLeaveRequest);
        return createPaginatedResult(data, total, paginationParams);
    }

    async getLeaveRequestById(id: string): Promise<LeaveRequest | null> {
        // BASE_SELECT already includes WHERE deleted_at IS NULL, so AND is appended
        const result = await query(
            `${BASE_SELECT}
             AND lr.id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToLeaveRequest(result.rows[0]);
    }

    async createLeaveRequest(requestData: CreateLeaveRequestDTO): Promise<LeaveRequest> {
        const { employeeId, type, startDate, endDate, reason, handoverEmployeeId, handoverNotes, medicalCertificatePath, isHalfDay, halfDayPeriod } = requestData;

        // Validate half-day constraints
        if (isHalfDay) {
            if (startDate !== endDate) {
                const err: any = new Error('Half-day leave is only available for single-day requests.');
                err.statusCode = 400;
                throw err;
            }
            if (!halfDayPeriod || !['morning', 'afternoon'].includes(halfDayPeriod)) {
                const err: any = new Error('Please select morning or afternoon for half-day leave.');
                err.statusCode = 400;
                throw err;
            }
        }

        // Calculate business days (excluding weekends and holidays)
        const start = new Date(startDate);
        const end = new Date(endDate);
        let days = await LeaveRequestService.calculateBusinessDays(startDate, endDate);
        if (isHalfDay) days = 0.5;

        // Validate leave quota using effective quotas (per-employee override > global default)
        const effectiveQuotas = await EmployeeLeaveQuotaService.getEffectiveQuotas(employeeId);
        const quota = effectiveQuotas.find(q => q.type === type);
        if (quota && quota.total !== -1) {
            const usedResult = await query(
                `SELECT COALESCE(SUM(COALESCE(business_days, (end_date::date - start_date::date) + 1)), 0) as used_days
                 FROM leave_requests
                 WHERE employee_id = $1 AND leave_type = $2 AND status IN ('Approved', 'Pending')
                   AND deleted_at IS NULL`,
                [employeeId, type]
            );
            const usedDays = parseFloat(usedResult.rows[0]?.used_days || '0');
            const remaining = quota.total - usedDays;
            if (days > remaining) {
                const err: any = new Error(
                    remaining <= 0
                        ? `You have no remaining ${type} days. (${usedDays}/${quota.total} used)`
                        : `Insufficient ${type} balance. You have ${remaining} day(s) remaining but requested ${days}.`
                );
                err.statusCode = 400;
                throw err;
            }
        }

        // Validate: no overlapping leave requests
        await this.checkOverlap(employeeId, startDate, endDate, undefined, isHalfDay, halfDayPeriod);

        // Validate: Maternity Leave always requires medical certificate
        if (type === LEAVE_TYPE_MATERNITY && !medicalCertificatePath) {
            const err: any = new Error('A medical certificate is required for maternity leave.');
            err.statusCode = 400;
            throw err;
        }

        // Format dates string (for notification only)
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        const dates = `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;

        const result = await query(
            `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status, handover_employee_id, handover_notes, medical_certificate_path, business_days, is_half_day, half_day_period)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`,
            [employeeId, type, startDate, endDate, reason || '', 'Pending', handoverEmployeeId || null, handoverNotes || null, medicalCertificatePath || null, days, isHalfDay || false, halfDayPeriod || null]
        );

        // Snapshot to history
        await this.snapshotToHistory(result.rows[0].id, 'created', employeeId);

        // Get employee info (avatar and name)
        const employeeResult = await query('SELECT avatar, name FROM employees WHERE id = $1', [employeeId]);
        const avatar = employeeResult.rows[0]?.avatar;
        const employeeName = employeeResult.rows[0]?.name;

        // Notify HR admins about new leave request
        try {
            await NotificationService.notifyAdmins({
                title: 'New Leave Request',
                message: `${employeeName} has submitted a ${type} leave request (${dates}).`,
                type: 'leave',
                link: '/leave-requests',
            });
        } catch (notifError) {
            console.error('Failed to notify admins about leave request:', notifError);
        }

        // Notify direct manager if employee has one
        try {
            const managerRow = await query(
                `SELECT u.id AS user_id FROM employees e
                 JOIN employees mgr ON mgr.id = e.manager_id
                 JOIN users u ON u.id = mgr.user_id
                 WHERE e.id = $1`,
                [employeeId]
            );
            if (managerRow.rows[0]?.user_id) {
                await NotificationService.create({
                    user_id: managerRow.rows[0].user_id,
                    title: 'Leave Request Needs Your Approval',
                    message: `${employeeName} has submitted a ${type} leave request (${dates}).`,
                    type: 'info',
                    link: '/leave-requests',
                });
            }
        } catch (notifError) {
            console.error('Failed to notify manager about leave request:', notifError);
        }

        return {
            ...this.mapRowToLeaveRequest(result.rows[0]),
            avatar,
            employeeName,
            dates,
            days,
        };
    }

    async editLeaveRequest(id: string, employeeId: string, editData: EditLeaveRequestDTO): Promise<LeaveRequest> {
        return withTransaction(async (txQuery) => {
            // Fetch existing request
            const existing = await txQuery(
                'SELECT * FROM leave_requests WHERE id = $1',
                [id]
            );

            if (existing.rows.length === 0) {
                const err: any = new Error('Leave request not found');
                err.statusCode = 404;
                throw err;
            }

            const row = existing.rows[0];

            if (row.employee_id !== employeeId) {
                const err: any = new Error('You can only edit your own leave requests');
                err.statusCode = 403;
                throw err;
            }

            if (!['Pending', 'Approved'].includes(row.status)) {
                const err: any = new Error('Only Pending or Approved leave requests can be edited');
                err.statusCode = 400;
                throw err;
            }

            // Guard: cannot edit started/past leaves
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDate = new Date(row.start_date);
            startDate.setHours(0, 0, 0, 0);
            if (startDate <= today) {
                const err: any = new Error('Cannot edit leaves that have already started or are in the past');
                err.statusCode = 400;
                throw err;
            }

            // Validate half-day constraints
            if (editData.isHalfDay) {
                if (editData.startDate !== editData.endDate) {
                    const err: any = new Error('Half-day leave is only available for single-day requests.');
                    err.statusCode = 400;
                    throw err;
                }
                if (!editData.halfDayPeriod || !['morning', 'afternoon'].includes(editData.halfDayPeriod)) {
                    const err: any = new Error('Please select morning or afternoon for half-day leave.');
                    err.statusCode = 400;
                    throw err;
                }
            }

            // Calculate new business days (excluding weekends and holidays)
            let newDays = await LeaveRequestService.calculateBusinessDays(editData.startDate, editData.endDate);
            if (editData.isHalfDay) newDays = 0.5;

            // Re-validate quota using effective quotas (exclude current request from used-days count)
            const effectiveQuotas = await EmployeeLeaveQuotaService.getEffectiveQuotas(employeeId);
            const quota = effectiveQuotas.find(q => q.type === editData.type);
            if (quota && quota.total !== -1) {
                const usedResult = await txQuery(
                    `SELECT COALESCE(SUM(COALESCE(business_days, (end_date::date - start_date::date) + 1)), 0) as used_days
                     FROM leave_requests
                     WHERE employee_id = $1 AND leave_type = $2 AND status IN ('Approved', 'Pending')
                       AND id != $3 AND deleted_at IS NULL`,
                    [employeeId, editData.type, id]
                );
                const usedDays = parseFloat(usedResult.rows[0]?.used_days || '0');
                const remaining = quota.total - usedDays;
                if (newDays > remaining) {
                    const err: any = new Error(
                        remaining <= 0
                            ? `You have no remaining ${editData.type} days. (${usedDays}/${quota.total} used)`
                            : `Insufficient ${editData.type} balance. You have ${remaining} day(s) remaining but requested ${newDays}.`
                    );
                    err.statusCode = 400;
                    throw err;
                }
            }

            // Re-validate: no overlapping leave requests (exclude self)
            await this.checkOverlap(employeeId, editData.startDate, editData.endDate, id, editData.isHalfDay, editData.halfDayPeriod);

            // Re-validate medical cert for Maternity Leave (always required)
            const medCertPath = editData.medicalCertificatePath || row.medical_certificate_path;
            if (editData.type === LEAVE_TYPE_MATERNITY && !medCertPath) {
                const err: any = new Error('A medical certificate is required for maternity leave.');
                err.statusCode = 400;
                throw err;
            }

            // Snapshot current state to history before editing
            await this.snapshotToHistory(id, 'edited', employeeId);

            // If was Approved, reset to Pending
            const newStatus = row.status === 'Approved' ? 'Pending' : row.status;

            // Update
            await txQuery(
                `UPDATE leave_requests
                 SET leave_type = $1, start_date = $2, end_date = $3, reason = $4,
                     handover_employee_id = $5, handover_notes = $6, medical_certificate_path = $7,
                     status = $8, business_days = $9, is_half_day = $10, half_day_period = $11, updated_at = NOW()
                 WHERE id = $12
                 RETURNING *`,
                [
                    editData.type,
                    editData.startDate,
                    editData.endDate,
                    editData.reason || '',
                    editData.handoverEmployeeId || null,
                    editData.handoverNotes || null,
                    editData.medicalCertificatePath || medCertPath || null,
                    newStatus,
                    newDays,
                    editData.isHalfDay || false,
                    editData.halfDayPeriod || null,
                    id,
                ]
            );

            const leaveRequest = await this.getLeaveRequestById(id);
            if (!leaveRequest) {
                throw new Error('Failed to retrieve updated leave request');
            }

            // Notify admins
            try {
                const employeeResult = await txQuery('SELECT name FROM employees WHERE id = $1', [employeeId]);
                const employeeName = employeeResult.rows[0]?.name || 'Unknown';
                await NotificationService.notifyAdmins({
                    title: 'Leave Request Edited',
                    message: `${employeeName} has edited their ${editData.type} leave request.${row.status === 'Approved' ? ' Status reset to Pending.' : ''}`,
                    type: 'leave',
                    link: '/leave-requests',
                });
            } catch (notifError) {
                console.error('Failed to notify admins about leave edit:', notifError);
            }

            return leaveRequest;
        });
    }

    async updateLeaveRequestStatus(id: string, updateData: UpdateLeaveRequestDTO): Promise<LeaveRequest> {
        const { status, rejectionReason, approverEmployeeId, managerApprovedBy, managerApprovedAt } = updateData;

        // Snapshot before status change
        await this.snapshotToHistory(id, 'status_change', approverEmployeeId || 'system');

        const result = await query(
            `UPDATE leave_requests
             SET status = $1, rejection_reason = $2, approver_id = $3,
                 manager_approved_by = COALESCE($4, manager_approved_by),
                 manager_approved_at = COALESCE($5, manager_approved_at),
                 updated_at = NOW()
             WHERE id = $6 RETURNING *`,
            [status, rejectionReason || null, approverEmployeeId || null,
             managerApprovedBy || null, managerApprovedAt || null, id]
        );

        if (result.rows.length === 0) {
            throw new Error('Leave request not found');
        }

        const leaveRequest = this.mapRowToLeaveRequest(result.rows[0]);

        // Notify employee on final status change only (not Manager Approved — HR still needs to act)
        if (status === 'Approved' || status === 'Rejected') {
            try {
                const employeeResult = await query(
                    'SELECT user_id, name FROM employees WHERE id = $1',
                    [leaveRequest.employeeId]
                );

                if (employeeResult.rows[0]?.user_id) {
                    const reasonSuffix = rejectionReason ? ` Reason: ${rejectionReason}` : '';
                    await NotificationService.create({
                        user_id: employeeResult.rows[0].user_id,
                        title: `Leave Request ${status}`,
                        message: status === 'Approved'
                            ? `Your ${leaveRequest.type} leave request has been approved.`
                            : `Your ${leaveRequest.type} leave request has been rejected.${reasonSuffix}`,
                        type: status === 'Approved' ? 'success' : 'warning',
                        link: '/time-off',
                    });
                }
            } catch (notifError) {
                console.error('Failed to send leave status notification:', notifError);
            }
        }

        return leaveRequest;
    }

    async cancelLeaveRequest(id: string, employeeId: string): Promise<{ action: 'deleted' | 'cancel_requested'; leaveRequest?: LeaveRequest }> {
        // BASE_SELECT already has WHERE deleted_at IS NULL → use AND for additional filter
        const existing = await query(
            `${BASE_SELECT}
             AND lr.id = $1`,
            [id]
        );

        if (existing.rows.length === 0) {
            const err: any = new Error('Leave request not found');
            err.statusCode = 404;
            throw err;
        }

        const row = existing.rows[0];

        if (row.employee_id !== employeeId) {
            const err: any = new Error('You can only cancel your own leave requests');
            err.statusCode = 403;
            throw err;
        }

        const status = row.status;

        if (status === 'Pending' || status === 'Manager Approved') {
            // Snapshot to history BEFORE soft-deleting so the record is still
            // accessible via the FK during the INSERT into leave_request_history
            await this.snapshotToHistory(id, 'cancel_requested', employeeId);
            // Soft delete — preserves the row for audit; quota & overlap queries
            // exclude rows where deleted_at IS NOT NULL
            await query(
                'UPDATE leave_requests SET deleted_at = NOW() WHERE id = $1',
                [id]
            );
            return { action: 'deleted' };
        }

        if (status === 'Approved') {
            // Guard: cannot cancel started/past leaves
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDate = new Date(row.start_date);
            startDate.setHours(0, 0, 0, 0);
            if (startDate <= today) {
                const err: any = new Error('Cannot cancel leaves that have already started or are in the past');
                err.statusCode = 400;
                throw err;
            }

            // Snapshot then set to Cancel Requested
            await this.snapshotToHistory(id, 'cancel_requested', employeeId);
            await query(
                `UPDATE leave_requests SET status = 'Cancel Requested', updated_at = NOW() WHERE id = $1`,
                [id]
            );

            const leaveRequest = await this.getLeaveRequestById(id);

            // Notify admins
            try {
                const employeeResult = await query('SELECT name FROM employees WHERE id = $1', [employeeId]);
                const employeeName = employeeResult.rows[0]?.name || 'Unknown';
                await NotificationService.notifyAdmins({
                    title: 'Leave Cancellation Requested',
                    message: `${employeeName} has requested to cancel their approved ${row.leave_type} leave.`,
                    type: 'leave',
                    link: '/leave-requests',
                });
            } catch (notifError) {
                console.error('Failed to notify admins about cancel request:', notifError);
            }

            return { action: 'cancel_requested', leaveRequest: leaveRequest || undefined };
        }

        // Rejected or Cancel Requested
        const err: any = new Error(`Cannot cancel a leave request with status "${status}"`);
        err.statusCode = 400;
        throw err;
    }

    async handleCancelDecision(id: string, decision: 'approve_cancel' | 'reject_cancel', approverEmployeeId: string): Promise<{ action: string; leaveRequest?: LeaveRequest }> {
        const existing = await query(
            'SELECT * FROM leave_requests WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );

        if (existing.rows.length === 0) {
            const err: any = new Error('Leave request not found');
            err.statusCode = 404;
            throw err;
        }

        const row = existing.rows[0];

        if (row.status !== 'Cancel Requested') {
            const err: any = new Error('This leave request is not in Cancel Requested status');
            err.statusCode = 400;
            throw err;
        }

        await this.snapshotToHistory(id, 'status_change', approverEmployeeId);

        if (decision === 'approve_cancel') {
            // Soft delete — record is preserved for audit trail
            await query(
                'UPDATE leave_requests SET deleted_at = NOW() WHERE id = $1',
                [id]
            );

            // Notify employee
            try {
                const employeeResult = await query(
                    'SELECT user_id, name FROM employees WHERE id = $1',
                    [row.employee_id]
                );
                if (employeeResult.rows[0]?.user_id) {
                    await NotificationService.create({
                        user_id: employeeResult.rows[0].user_id,
                        title: 'Leave Cancellation Approved',
                        message: `Your ${row.leave_type} leave cancellation has been approved.`,
                        type: 'success',
                        link: '/time-off',
                    });
                }
            } catch (notifError) {
                console.error('Failed to notify employee about cancel approval:', notifError);
            }

            return { action: 'deleted' };
        }

        // reject_cancel: revert to Approved
        await query(
            `UPDATE leave_requests SET status = 'Approved', updated_at = NOW() WHERE id = $1`,
            [id]
        );

        const leaveRequest = await this.getLeaveRequestById(id);

        // Notify employee
        try {
            const employeeResult = await query(
                'SELECT user_id, name FROM employees WHERE id = $1',
                [row.employee_id]
            );
            if (employeeResult.rows[0]?.user_id) {
                await NotificationService.create({
                    user_id: employeeResult.rows[0].user_id,
                    title: 'Leave Cancellation Rejected',
                    message: `Your ${row.leave_type} leave cancellation has been rejected. Your leave remains approved.`,
                    type: 'warning',
                    link: '/time-off',
                });
            }
        } catch (notifError) {
            console.error('Failed to notify employee about cancel rejection:', notifError);
        }

        return { action: 'reverted', leaveRequest: leaveRequest || undefined };
    }

    private async checkOverlap(employeeId: string, startDate: string, endDate: string, excludeId?: string, isHalfDay?: boolean, halfDayPeriod?: string): Promise<void> {
        const params: any[] = [employeeId, startDate, endDate];
        let excludeClause = '';
        if (excludeId) {
            params.push(excludeId);
            excludeClause = `AND id != $${params.length}`;
        }
        const result = await query(
            `SELECT id, leave_type, start_date, end_date, is_half_day, half_day_period FROM leave_requests
             WHERE employee_id = $1
             AND status IN ('Pending', 'Approved')
             AND start_date <= $3::date AND end_date >= $2::date
             AND deleted_at IS NULL
             ${excludeClause}`,
            params
        );
        for (const row of result.rows) {
            // Half-day on same single day with different period → not a conflict
            if (isHalfDay && row.is_half_day && startDate === endDate
                && toDateString(row.start_date) === toDateString(row.end_date)
                && startDate === toDateString(row.start_date)
                && halfDayPeriod !== row.half_day_period) {
                continue;
            }
            const fmtStart = toDateString(row.start_date);
            const fmtEnd = toDateString(row.end_date);
            const err: any = new Error(
                `This leave overlaps with an existing ${row.leave_type} request (${fmtStart} - ${fmtEnd}).`
            );
            err.statusCode = 409;
            throw err;
        }
    }

    async deleteLeaveRequest(id: string): Promise<void> {
        // Soft delete — HR records must never be permanently removed
        const result = await query(
            'UPDATE leave_requests SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );
        if (result.rowCount === 0) {
            throw new Error('Leave request not found');
        }
    }

    async getLeaveBalances(employeeId: string): Promise<any[]> {
        const result = await query(
            `SELECT leave_type,
                    SUM(COALESCE(business_days, (end_date::date - start_date::date) + 1)) as used_days
             FROM leave_requests
             WHERE employee_id = $1 AND status = 'Approved' AND deleted_at IS NULL
             GROUP BY leave_type`,
            [employeeId]
        );

        const usedDays = result.rows.reduce((acc: any, row: any) => {
            acc[row.leave_type] = parseFloat(row.used_days);
            return acc;
        }, {});

        const effectiveQuotas = await EmployeeLeaveQuotaService.getEffectiveQuotas(employeeId);

        return effectiveQuotas.map(({ type, total, isOverride }) => ({
            type,
            total,
            used: usedDays[type] || 0,
            remaining: total === -1 ? -1 : Math.max(0, total - (usedDays[type] || 0)),
            isOverride,
        }));
    }

    private async snapshotToHistory(leaveRequestId: string, changeType: string, changedBy: string): Promise<void> {
        try {
            await query(
                `INSERT INTO leave_request_history
                    (leave_request_id, employee_id, leave_type, start_date, end_date, reason, status,
                     approver_id, rejection_reason, handover_employee_id, handover_notes,
                     medical_certificate_path, business_days, is_half_day, half_day_period, change_type, changed_by)
                 SELECT id, employee_id, leave_type, start_date, end_date, reason, status,
                        approver_id, rejection_reason, handover_employee_id, handover_notes,
                        medical_certificate_path, business_days, is_half_day, half_day_period, $2, $3
                 FROM leave_requests WHERE id = $1`,
                [leaveRequestId, changeType, changedBy]
            );
        } catch (err) {
            console.error('Failed to snapshot leave request history:', err);
        }
    }

    private mapRowToLeaveRequest(row: any): LeaveRequest {
        return {
            id: row.id,
            employeeId: row.employee_id,
            employeeName: row.employee_name,
            type: row.leave_type,
            startDate: toDateString(row.start_date),
            endDate: toDateString(row.end_date),
            dates: row.dates,
            days: row.days,
            reason: row.reason,
            status: row.status,
            avatar: row.avatar,
            handoverEmployeeId: row.handover_employee_id || undefined,
            handoverEmployeeName: row.handover_employee_name || undefined,
            handoverNotes: row.handover_notes || undefined,
            medicalCertificatePath: row.medical_certificate_path || undefined,
            rejectionReason: row.rejection_reason || undefined,
            approverEmployeeId: row.approver_id || undefined,
            updatedAt: row.updated_at || undefined,
            isHalfDay: row.is_half_day || false,
            halfDayPeriod: row.half_day_period || undefined,
        };
    }
}

export default new LeaveRequestService();
