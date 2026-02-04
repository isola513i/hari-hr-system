import { query } from '../db';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breakDuration: number;
  totalHours: number | null;
  status: 'Present' | 'Absent' | 'Late' | 'Half-day' | 'Remote';
  notes: string | null;
  createdAt: Date;
}

export interface ClockInData {
  employeeId: string;
  notes?: string;
}

export interface ClockOutData {
  employeeId: string;
  notes?: string;
}

export class AttendanceService {
  /**
   * Clock in for an employee
   */
  async clockIn(data: ClockInData): Promise<AttendanceRecord> {
    const { employeeId, notes } = data;

    // Use Thailand timezone (UTC+7)
    const bangkokTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
    const now = new Date(bangkokTime);
    const today = now.toISOString().split('T')[0];

    // Check if already clocked in today
    const existing = await query(
      'SELECT * FROM attendance_records WHERE employee_id = $1 AND date = $2',
      [employeeId, today]
    );

    if (existing.rows.length > 0 && existing.rows[0].clock_in) {
      throw new Error('Already clocked in for today');
    }

    // Determine if late (after 9:00 AM Thailand time)
    const lateThreshold = new Date(now);
    lateThreshold.setHours(9, 0, 0, 0);
    const status = now > lateThreshold ? 'Late' : 'Present';

    if (existing.rows.length > 0) {
      // Update existing record
      const result = await query(
        `UPDATE attendance_records
         SET clock_in = $1, status = $2, notes = COALESCE($3, notes), updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [now, status, notes, existing.rows[0].id]
      );
      return this.mapRowToAttendance(result.rows[0]);
    }

    // Create new record
    const result = await query(
      `INSERT INTO attendance_records (employee_id, date, clock_in, status, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [employeeId, today, now, status, notes]
    );

    return this.mapRowToAttendance(result.rows[0]);
  }

  /**
   * Clock out for an employee
   */
  async clockOut(data: ClockOutData): Promise<AttendanceRecord> {
    const { employeeId, notes } = data;

    // Use Thailand timezone (UTC+7)
    const bangkokTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
    const now = new Date(bangkokTime);
    const today = now.toISOString().split('T')[0];

    // Find today's attendance record
    const existing = await query(
      'SELECT * FROM attendance_records WHERE employee_id = $1 AND date = $2',
      [employeeId, today]
    );

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

    const result = await query(
      `UPDATE attendance_records
       SET clock_out = $1, total_hours = $2, status = $3, notes = COALESCE($4, notes), updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [now, totalHours, status, notes, existing.rows[0].id]
    );

    return this.mapRowToAttendance(result.rows[0]);
  }

  /**
   * Get attendance for an employee by date range
   */
  async getAttendanceByEmployee(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ): Promise<AttendanceRecord[]> {
    let queryText = 'SELECT * FROM attendance_records WHERE employee_id = $1';
    const params: unknown[] = [employeeId];
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

    const result = await query(queryText, params);
    return result.rows.map(this.mapRowToAttendance);
  }

  /**
   * Get today's attendance status for an employee
   */
  async getTodayStatus(employeeId: string): Promise<AttendanceRecord | null> {
    // Use Thailand timezone (UTC+7)
    const bangkokTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
    const today = new Date(bangkokTime).toISOString().split('T')[0];

    const result = await query(
      'SELECT * FROM attendance_records WHERE employee_id = $1 AND date = $2',
      [employeeId, today]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAttendance(result.rows[0]);
  }

  /**
   * Get attendance summary for a date range
   */
  async getAttendanceSummary(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    remoteDays: number;
    totalHours: number;
  }> {
    const result = await query(
      `SELECT
        COUNT(*) as total_days,
        COUNT(*) FILTER (WHERE status = 'Present') as present_days,
        COUNT(*) FILTER (WHERE status = 'Absent') as absent_days,
        COUNT(*) FILTER (WHERE status = 'Late') as late_days,
        COUNT(*) FILTER (WHERE status = 'Remote') as remote_days,
        COALESCE(SUM(total_hours), 0) as total_hours
       FROM attendance_records
       WHERE employee_id = $1 AND date BETWEEN $2 AND $3`,
      [employeeId, startDate, endDate]
    );

    const row = result.rows[0];
    return {
      totalDays: parseInt(row.total_days, 10),
      presentDays: parseInt(row.present_days, 10),
      absentDays: parseInt(row.absent_days, 10),
      lateDays: parseInt(row.late_days, 10),
      remoteDays: parseInt(row.remote_days, 10),
      totalHours: parseFloat(row.total_hours),
    };
  }

  private mapRowToAttendance(row: Record<string, unknown>): AttendanceRecord {
    return {
      id: row.id as string,
      employeeId: row.employee_id as string,
      date: row.date as string,
      clockIn: row.clock_in as string | null,
      clockOut: row.clock_out as string | null,
      breakDuration: row.break_duration as number,
      totalHours: row.total_hours as number | null,
      status: row.status as AttendanceRecord['status'],
      notes: row.notes as string | null,
      createdAt: row.created_at as Date,
    };
  }
}

export default new AttendanceService();
