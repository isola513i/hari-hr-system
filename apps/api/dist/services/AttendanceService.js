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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const db_1 = require("../db");
class AttendanceService {
    /**
     * Clock in for an employee
     */
    clockIn(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { employeeId, notes } = data;
            // Use Thailand timezone (UTC+7)
            const bangkokTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
            const now = new Date(bangkokTime);
            const today = now.toISOString().split('T')[0];
            // Check if already clocked in today
            const existing = yield (0, db_1.query)('SELECT * FROM attendance_records WHERE employee_id = $1 AND date = $2', [employeeId, today]);
            if (existing.rows.length > 0 && existing.rows[0].clock_in) {
                throw new Error('Already clocked in for today');
            }
            // Determine if late (after 9:00 AM Thailand time)
            const lateThreshold = new Date(now);
            lateThreshold.setHours(9, 0, 0, 0);
            const status = now > lateThreshold ? 'Late' : 'Present';
            if (existing.rows.length > 0) {
                // Update existing record
                const result = yield (0, db_1.query)(`UPDATE attendance_records
         SET clock_in = $1, status = $2, notes = COALESCE($3, notes), updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`, [now, status, notes, existing.rows[0].id]);
                return this.mapRowToAttendance(result.rows[0]);
            }
            // Create new record
            const result = yield (0, db_1.query)(`INSERT INTO attendance_records (employee_id, date, clock_in, status, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [employeeId, today, now, status, notes]);
            return this.mapRowToAttendance(result.rows[0]);
        });
    }
    /**
     * Clock out for an employee
     */
    clockOut(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { employeeId, notes } = data;
            // Use Thailand timezone (UTC+7)
            const bangkokTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
            const now = new Date(bangkokTime);
            const today = now.toISOString().split('T')[0];
            // Find today's attendance record
            const existing = yield (0, db_1.query)('SELECT * FROM attendance_records WHERE employee_id = $1 AND date = $2', [employeeId, today]);
            if (existing.rows.length === 0 || !existing.rows[0].clock_in) {
                throw new Error('Must clock in before clocking out');
            }
            if (existing.rows[0].clock_out) {
                throw new Error('Already clocked out for today');
            }
            const clockIn = new Date(existing.rows[0].clock_in);
            const breakDuration = existing.rows[0].break_duration || 0;
            const totalMinutes = (now.getTime() - clockIn.getTime()) / 1000 / 60 - breakDuration;
            const totalHours = Math.round(totalMinutes / 60 * 100) / 100;
            // Determine if half-day (less than 4 hours)
            const status = totalHours < 4 ? 'Half-day' : existing.rows[0].status;
            const result = yield (0, db_1.query)(`UPDATE attendance_records
       SET clock_out = $1, total_hours = $2, status = $3, notes = COALESCE($4, notes), updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`, [now, totalHours, status, notes, existing.rows[0].id]);
            return this.mapRowToAttendance(result.rows[0]);
        });
    }
    /**
     * Get attendance for an employee by date range
     */
    getAttendanceByEmployee(employeeId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            let queryText = 'SELECT * FROM attendance_records WHERE employee_id = $1';
            const params = [employeeId];
            let paramIndex = 2;
            if (startDate) {
                queryText += ` AND date >= $${paramIndex++}`;
                params.push(startDate);
            }
            if (endDate) {
                queryText += ` AND date <= $${paramIndex++}`;
                params.push(endDate);
            }
            queryText += ' ORDER BY date DESC';
            const result = yield (0, db_1.query)(queryText, params);
            return result.rows.map(this.mapRowToAttendance);
        });
    }
    /**
     * Get today's attendance status for an employee
     */
    getTodayStatus(employeeId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Use Thailand timezone (UTC+7)
            const bangkokTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
            const today = new Date(bangkokTime).toISOString().split('T')[0];
            const result = yield (0, db_1.query)('SELECT * FROM attendance_records WHERE employee_id = $1 AND date = $2', [employeeId, today]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapRowToAttendance(result.rows[0]);
        });
    }
    /**
     * Get attendance summary for a date range
     */
    getAttendanceSummary(employeeId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)(`SELECT
        COUNT(*) as total_days,
        COUNT(*) FILTER (WHERE status = 'Present') as present_days,
        COUNT(*) FILTER (WHERE status = 'Absent') as absent_days,
        COUNT(*) FILTER (WHERE status = 'Late') as late_days,
        COUNT(*) FILTER (WHERE status = 'Remote') as remote_days,
        COALESCE(SUM(total_hours), 0) as total_hours
       FROM attendance_records
       WHERE employee_id = $1 AND date BETWEEN $2 AND $3`, [employeeId, startDate, endDate]);
            const row = result.rows[0];
            return {
                totalDays: parseInt(row.total_days, 10),
                presentDays: parseInt(row.present_days, 10),
                absentDays: parseInt(row.absent_days, 10),
                lateDays: parseInt(row.late_days, 10),
                remoteDays: parseInt(row.remote_days, 10),
                totalHours: parseFloat(row.total_hours),
            };
        });
    }
    mapRowToAttendance(row) {
        return {
            id: row.id,
            employeeId: row.employee_id,
            date: row.date,
            clockIn: row.clock_in,
            clockOut: row.clock_out,
            breakDuration: row.break_duration,
            totalHours: row.total_hours,
            status: row.status,
            notes: row.notes,
            createdAt: row.created_at,
        };
    }
}
exports.AttendanceService = AttendanceService;
exports.default = new AttendanceService();
