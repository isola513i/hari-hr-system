import { query } from '../db';
import { LeaveRequest, CreateLeaveRequestDTO, UpdateLeaveRequestDTO } from '../models/LeaveRequest';

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
        const { employeeId, employeeName, type, startDate, endDate, reason } = requestData;

        // Calculate days
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Format dates string
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        const dates = `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;

        const result = await query(
            `INSERT INTO leave_requests (employee_id, employee_name, type, start_date, end_date, dates, days, reason, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [employeeId, employeeName, type, startDate, endDate, dates, days, reason || '', 'Pending']
        );

        // Get avatar
        const employeeResult = await query('SELECT avatar FROM employees WHERE id = $1', [employeeId]);
        const avatar = employeeResult.rows[0]?.avatar;

        return {
            ...this.mapRowToLeaveRequest(result.rows[0]),
            avatar,
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

        return this.mapRowToLeaveRequest(result.rows[0]);
    }

    async deleteLeaveRequest(id: string): Promise<void> {
        const result = await query('DELETE FROM leave_requests WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            throw new Error('Leave request not found');
        }
    }

    async getLeaveBalances(employeeId: string): Promise<any[]> {
        // Get all leave requests for this employee
        const result = await query(
            `SELECT type, SUM(days) as used_days
             FROM leave_requests
             WHERE employee_id = $1 AND status = 'Approved'
             GROUP BY type`,
            [employeeId]
        );

        const usedDays = result.rows.reduce((acc: any, row: any) => {
            acc[row.type] = parseInt(row.used_days);
            return acc;
        }, {});

        // Define leave types and totals
        const leaveTypes = [
            { type: 'Vacation', total: 15 },
            { type: 'Sick Leave', total: 10 },
            { type: 'Personal Day', total: Infinity },
        ];

        return leaveTypes.map(({ type, total }) => ({
            type,
            total,
            used: usedDays[type] || 0,
            remaining: total === Infinity ? Infinity : total - (usedDays[type] || 0),
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
