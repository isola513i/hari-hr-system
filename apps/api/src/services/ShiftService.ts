import { query } from '../db';

export interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
  isActive: boolean;
  createdAt: Date;
}

export interface ShiftAssignment {
  assignmentId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  shiftId: string;
  shiftName: string;
  color: string;
  startTime: string;
  endTime: string;
  date: string;
  notes: string | null;
}

function mapShift(row: Record<string, unknown>): ShiftTemplate {
  return {
    id: row.id as string,
    name: row.name as string,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    color: row.color as string,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as Date,
  };
}

class ShiftService {
  async listShifts(): Promise<ShiftTemplate[]> {
    const result = await query(
      `SELECT * FROM shifts WHERE is_active = true ORDER BY start_time`
    );
    return result.rows.map(mapShift);
  }

  async createShift(data: { name: string; startTime: string; endTime: string; color?: string }): Promise<ShiftTemplate> {
    const result = await query(
      `INSERT INTO shifts (name, start_time, end_time, color)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.name, data.startTime, data.endTime, data.color ?? 'blue']
    );
    return mapShift(result.rows[0]);
  }

  async updateShift(id: string, data: { name?: string; startTime?: string; endTime?: string; color?: string }): Promise<ShiftTemplate | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (data.name !== undefined) { fields.push(`name = $${i++}`); params.push(data.name); }
    if (data.startTime !== undefined) { fields.push(`start_time = $${i++}`); params.push(data.startTime); }
    if (data.endTime !== undefined) { fields.push(`end_time = $${i++}`); params.push(data.endTime); }
    if (data.color !== undefined) { fields.push(`color = $${i++}`); params.push(data.color); }
    if (!fields.length) return null;
    params.push(id);
    const result = await query(
      `UPDATE shifts SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );
    return result.rows[0] ? mapShift(result.rows[0]) : null;
  }

  async deleteShift(id: string): Promise<void> {
    await query(`UPDATE shifts SET is_active = false WHERE id = $1`, [id]);
  }

  async getSchedule(startDate: string, endDate: string, department?: string): Promise<ShiftAssignment[]> {
    let sql = `
      SELECT
        sa.id AS assignment_id,
        sa.employee_id,
        e.name AS employee_name,
        e.department,
        s.id AS shift_id,
        s.name AS shift_name,
        s.color,
        TO_CHAR(s.start_time, 'HH24:MI') AS start_time,
        TO_CHAR(s.end_time, 'HH24:MI') AS end_time,
        TO_CHAR(sa.date, 'YYYY-MM-DD') AS date,
        sa.notes
      FROM shift_assignments sa
      JOIN shifts s ON sa.shift_id = s.id
      JOIN employees e ON sa.employee_id = e.id
      WHERE sa.date BETWEEN $1 AND $2
    `;
    const params: unknown[] = [startDate, endDate];
    if (department && department !== 'All') {
      sql += ` AND e.department = $3`;
      params.push(department);
    }
    sql += ` ORDER BY sa.date, e.name`;
    const result = await query(sql, params);
    return result.rows.map((row) => ({
      assignmentId: row.assignment_id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      department: row.department,
      shiftId: row.shift_id,
      shiftName: row.shift_name,
      color: row.color,
      startTime: row.start_time,
      endTime: row.end_time,
      date: row.date,
      notes: row.notes,
    }));
  }

  async assignShift(employeeIds: string[], shiftId: string, dates: string[], createdBy?: string): Promise<void> {
    for (const empId of employeeIds) {
      for (const date of dates) {
        await query(
          `INSERT INTO shift_assignments (employee_id, shift_id, date, created_by)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (employee_id, date) DO UPDATE SET shift_id = EXCLUDED.shift_id, created_by = EXCLUDED.created_by`,
          [empId, shiftId, date, createdBy ?? null]
        );
      }
    }
  }

  async removeAssignment(id: string): Promise<void> {
    await query(`DELETE FROM shift_assignments WHERE id = $1`, [id]);
  }

  async getMySchedule(employeeId: string, startDate: string, endDate: string): Promise<ShiftAssignment[]> {
    const result = await query(
      `SELECT
         sa.id AS assignment_id,
         sa.employee_id,
         e.name AS employee_name,
         e.department,
         s.id AS shift_id,
         s.name AS shift_name,
         s.color,
         TO_CHAR(s.start_time, 'HH24:MI') AS start_time,
         TO_CHAR(s.end_time, 'HH24:MI') AS end_time,
         TO_CHAR(sa.date, 'YYYY-MM-DD') AS date,
         sa.notes
       FROM shift_assignments sa
       JOIN shifts s ON sa.shift_id = s.id
       JOIN employees e ON sa.employee_id = e.id
       WHERE sa.employee_id = $1 AND sa.date BETWEEN $2 AND $3
       ORDER BY sa.date`,
      [employeeId, startDate, endDate]
    );
    return result.rows.map((row) => ({
      assignmentId: row.assignment_id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      department: row.department,
      shiftId: row.shift_id,
      shiftName: row.shift_name,
      color: row.color,
      startTime: row.start_time,
      endTime: row.end_time,
      date: row.date,
      notes: row.notes,
    }));
  }
}

export default new ShiftService();
