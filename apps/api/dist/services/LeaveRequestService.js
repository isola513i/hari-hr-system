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
exports.LeaveRequestService = void 0;
const db_1 = require("../db");
const SystemConfigService_1 = __importDefault(require("./SystemConfigService"));
const NotificationService_1 = __importDefault(require("./NotificationService"));
class LeaveRequestService {
    getAllLeaveRequests() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)(`
            SELECT lr.*, e.avatar, e.name as employee_name,
                   (lr.end_date::date - lr.start_date::date) + 1 as days,
                   TO_CHAR(lr.start_date, 'Mon DD') || ' - ' || TO_CHAR(lr.end_date, 'Mon DD') as dates
            FROM leave_requests lr
            LEFT JOIN employees e ON lr.employee_id = e.id
            ORDER BY lr.created_at DESC
        `);
            return result.rows.map(this.mapRowToLeaveRequest);
        });
    }
    getLeaveRequestById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)(`SELECT lr.*, e.avatar, e.name as employee_name,
                    (lr.end_date::date - lr.start_date::date) + 1 as days,
                    TO_CHAR(lr.start_date, 'Mon DD') || ' - ' || TO_CHAR(lr.end_date, 'Mon DD') as dates
             FROM leave_requests lr
             LEFT JOIN employees e ON lr.employee_id = e.id
             WHERE lr.id = $1`, [id]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapRowToLeaveRequest(result.rows[0]);
        });
    }
    createLeaveRequest(requestData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { employeeId, type, startDate, endDate, reason } = requestData;
            // Calculate days (for notification only)
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            // Format dates string (for notification only)
            const options = { month: 'short', day: 'numeric' };
            const dates = `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
            const result = yield (0, db_1.query)(`INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`, [employeeId, type, startDate, endDate, reason || '', 'Pending']);
            // Get employee info (avatar and name)
            const employeeResult = yield (0, db_1.query)('SELECT avatar, name FROM employees WHERE id = $1', [employeeId]);
            const avatar = (_a = employeeResult.rows[0]) === null || _a === void 0 ? void 0 : _a.avatar;
            const employeeName = (_b = employeeResult.rows[0]) === null || _b === void 0 ? void 0 : _b.name;
            // Notify HR admins about new leave request
            try {
                yield NotificationService_1.default.notifyAdmins({
                    title: 'New Leave Request',
                    message: `${employeeName} has submitted a ${type} leave request (${dates}).`,
                    type: 'leave',
                    link: '/time-off',
                });
            }
            catch (notifError) {
                console.error('Failed to notify admins about leave request:', notifError);
            }
            return Object.assign(Object.assign({}, this.mapRowToLeaveRequest(result.rows[0])), { avatar,
                employeeName,
                // Add computed fields
                dates,
                days });
        });
    }
    updateLeaveRequestStatus(id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { status } = updateData;
            const result = yield (0, db_1.query)(`UPDATE leave_requests SET status = $1 WHERE id = $2 RETURNING *`, [status, id]);
            if (result.rows.length === 0) {
                throw new Error('Leave request not found');
            }
            const leaveRequest = this.mapRowToLeaveRequest(result.rows[0]);
            // Send notification to employee about status change
            try {
                // Get employee's user_id
                const employeeResult = yield (0, db_1.query)('SELECT user_id, name FROM employees WHERE id = $1', [leaveRequest.employeeId]);
                if ((_a = employeeResult.rows[0]) === null || _a === void 0 ? void 0 : _a.user_id) {
                    const employee = employeeResult.rows[0];
                    const isApproved = status === 'Approved';
                    yield NotificationService_1.default.create({
                        user_id: employee.user_id,
                        title: `Leave Request ${status}`,
                        message: isApproved
                            ? `Your ${leaveRequest.type} leave request has been approved.`
                            : `Your ${leaveRequest.type} leave request has been ${status.toLowerCase()}.`,
                        type: isApproved ? 'success' : 'warning',
                        link: '/time-off',
                    });
                }
            }
            catch (notifError) {
                console.error('Failed to send leave status notification:', notifError);
            }
            return leaveRequest;
        });
    }
    deleteLeaveRequest(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)('DELETE FROM leave_requests WHERE id = $1', [id]);
            if (result.rowCount === 0) {
                throw new Error('Leave request not found');
            }
        });
    }
    getLeaveBalances(employeeId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get all leave requests for this employee
            // Calculate days from start_date and end_date since 'days' column doesn't exist
            const result = yield (0, db_1.query)(`SELECT leave_type,
                    SUM((end_date::date - start_date::date) + 1) as used_days
             FROM leave_requests
             WHERE employee_id = $1 AND status = 'Approved'
             GROUP BY leave_type`, [employeeId]);
            const usedDays = result.rows.reduce((acc, row) => {
                acc[row.leave_type] = parseInt(row.used_days);
                return acc;
            }, {});
            // Get leave quotas from database configuration
            const leaveQuotas = yield SystemConfigService_1.default.getLeaveQuotas();
            return leaveQuotas.map(({ type, total }) => ({
                type,
                total: total === -1 ? Infinity : total, // -1 in DB means unlimited
                used: usedDays[type] || 0,
                remaining: total === -1 ? Infinity : total - (usedDays[type] || 0),
            }));
        });
    }
    mapRowToLeaveRequest(row) {
        return {
            id: row.id,
            employeeId: row.employee_id,
            employeeName: row.employee_name,
            type: row.leave_type,
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
exports.LeaveRequestService = LeaveRequestService;
exports.default = new LeaveRequestService();
