import { query } from '../db';
import { LeaveRequest, CreateLeaveRequestDTO, UpdateLeaveRequestDTO } from '../models/LeaveRequest';
import SystemConfigService from './SystemConfigService';
import NotificationService from './NotificationService';

export class LeaveRequestService {
    async getAllLeaveRequests(): Promise<LeaveRequest[]> {
        const result = await query(`
            SELECT lr.*, e.avatar, e.name as employee_name
            FROM leave_requests lr
            LEFT JOIN employees e ON lr.employee_id = e.id
            ORDER BY lr.created_at DESC
        `);
        return result.rows.map(this.mapRowToLeaveRequest);
    }

    async getLeaveRequestById(id: string): Promise<LeaveRequest | null> {
        const result = await query(
            `SELECT lr.*, e.avatar, e.name as employee_name
             FROM leave_requests lr
             LEFT JOIN employees e ON lr.employee_id = e.id
             WHERE lr.id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToLeaveRequest(result.rows[0]);
    }

    async createLeaveRequest(requestData: CreateLeaveRequestDTO): Promise<LeaveRequest> {
        const { employeeId, type, startDate, endDate, reason } = requestData;

        // Calculate days
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Format dates string
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        const dates = `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;

        const result = await query(
            `INSERT INTO leave_requests (employee_id, type, start_date, end_date, dates, days, reason, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [employeeId, type, startDate, endDate, dates, days, reason || '', 'Pending']
        );

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
                link: '/time-off',
            });
        } catch (notifError) {
            console.error('Failed to notify admins about leave request:', notifError);
        }

        return {
            ...this.mapRowToLeaveRequest(result.rows[0]),
            avatar,
            employeeName,
        };
    }

    async updateLeaveRequestStatus(id: string, updateData: UpdateLeaveRequestDTO): Promise<LeaveRequest> {
        const { status } = updateData;

        const result = await query(
            `UPDATE leave_requests SET status = $1 WHERE id = $2 RETURNING *`,
            [status, id]
        );

        if (result.rows.length === 0) {
            throw new Error('Leave request not found');
        }

        const leaveRequest = this.mapRowToLeaveRequest(result.rows[0]);

        // Send notification to employee about status change
        try {
            // Get employee's user_id
            const employeeResult = await query(
                'SELECT user_id, name FROM employees WHERE id = $1',
                [leaveRequest.employeeId]
            );

            if (employeeResult.rows[0]?.user_id) {
                const employee = employeeResult.rows[0];
                const isApproved = status === 'Approved';

                await NotificationService.create({
                    user_id: employee.user_id,
                    title: `Leave Request ${status}`,
                    message: isApproved
                        ? `Your ${leaveRequest.type} leave request has been approved.`
                        : `Your ${leaveRequest.type} leave request has been ${status.toLowerCase()}.`,
                    type: isApproved ? 'success' : 'warning',
                    link: '/time-off',
                });
            }
        } catch (notifError) {
            console.error('Failed to send leave status notification:', notifError);
        }

        return leaveRequest;
    }

    async deleteLeaveRequest(id: string): Promise<void> {
        const result = await query('DELETE FROM leave_requests WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            throw new Error('Leave request not found');
        }
    }

    async getLeaveBalances(employeeId: string): Promise<any[]> {
        // Get all leave requests for this employee
        // Calculate days from start_date and end_date since 'days' column doesn't exist
        const result = await query(
            `SELECT leave_type,
                    SUM((end_date::date - start_date::date) + 1) as used_days
             FROM leave_requests
             WHERE employee_id = $1 AND status = 'Approved'
             GROUP BY leave_type`,
            [employeeId]
        );

        const usedDays = result.rows.reduce((acc: any, row: any) => {
            acc[row.leave_type] = parseInt(row.used_days);
            return acc;
        }, {});

        // Get leave quotas from database configuration
        const leaveQuotas = await SystemConfigService.getLeaveQuotas();

        return leaveQuotas.map(({ type, total }) => ({
            type,
            total: total === -1 ? Infinity : total, // -1 in DB means unlimited
            used: usedDays[type] || 0,
            remaining: total === -1 ? Infinity : total - (usedDays[type] || 0),
        }));
    }

    private mapRowToLeaveRequest(row: any): LeaveRequest {
        return {
            id: row.id,
            employeeId: row.employee_id,
            employeeName: row.employee_name,
            type: row.type,
            startDate: row.start_date,
            endDate: row.end_date,
            dates: row.dates,
            days: row.days,
            reason: row.reason,
            status: row.status,
            avatar: row.avatar,
        };
    }
}

export default new LeaveRequestService();
