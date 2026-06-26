import { query } from '../db';
import { withTransaction, TxQuery } from '../utils/transaction';
import { BusinessError } from '../utils/errorResponse';

export interface JobHistory {
  id: string;
  employeeId: string;
  role: string;
  department: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: string | null;
}

class JobHistoryService {
  async getByEmployeeId(employeeId: string): Promise<JobHistory[]> {
    const result = await query(
      'SELECT id, employee_id, role, department, start_date, end_date, description, created_at, updated_at, created_by FROM job_history WHERE employee_id = $1 ORDER BY start_date DESC',
      [employeeId]
    );
    return result.rows.map(this.mapRow);
  }

  async getById(id: string): Promise<JobHistory | null> {
    const result = await query('SELECT id, employee_id, role, department, start_date, end_date, description, created_at, updated_at, created_by FROM job_history WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async create(data: {
    employeeId: string;
    role: string;
    department: string;
    startDate: string;
    endDate?: string | null;
    description?: string;
    createdBy?: string;
  }): Promise<JobHistory> {
    const endDate = data.endDate && data.endDate !== 'Present' ? data.endDate : null;

    // Validate dates
    if (endDate && new Date(endDate) < new Date(data.startDate)) {
      throw new BusinessError('End date cannot be before start date');
    }

    return withTransaction(async (txQuery) => {
      // Close the current open position (if any)
      await this.closeCurrentPosition(data.employeeId, data.startDate, txQuery);

      const result = await txQuery(
        `INSERT INTO job_history (employee_id, role, department, start_date, end_date, description, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [data.employeeId, data.role, data.department, data.startDate, endDate, data.description || null, data.createdBy || null]
      );
      return this.mapRow(result.rows[0]);
    });
  }

  async update(id: string, data: {
    role?: string;
    department?: string;
    startDate?: string;
    endDate?: string | null;
    description?: string;
  }): Promise<JobHistory | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const endDate = data.endDate !== undefined
      ? (data.endDate && data.endDate !== 'Present' ? data.endDate : null)
      : undefined;

    // Validate dates if both provided
    const effectiveStart = data.startDate || existing.startDate;
    const effectiveEnd = endDate !== undefined ? endDate : existing.endDate;
    if (effectiveEnd && new Date(effectiveEnd) < new Date(effectiveStart)) {
      throw new BusinessError('End date cannot be before start date');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.role !== undefined) { fields.push(`role = $${paramIndex++}`); values.push(data.role); }
    if (data.department !== undefined) { fields.push(`department = $${paramIndex++}`); values.push(data.department); }
    if (data.startDate !== undefined) { fields.push(`start_date = $${paramIndex++}`); values.push(data.startDate); }
    if (endDate !== undefined) { fields.push(`end_date = $${paramIndex++}`); values.push(endDate); }
    if (data.description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(data.description); }

    if (fields.length === 0) return existing;

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await query(
      `UPDATE job_history SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const result = await query('DELETE FROM job_history WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      throw new BusinessError('Job history entry not found');
    }
  }

  async autoCreateFromEmployeeUpdate(
    employeeId: string,
    oldRole: string,
    oldDepartment: string,
    newRole: string,
    newDepartment: string,
    createdBy?: string
  ): Promise<JobHistory> {
    const parts: string[] = [];
    if (oldRole !== newRole) {
      parts.push(`Role changed from ${oldRole} to ${newRole}`);
    }
    if (oldDepartment !== newDepartment) {
      parts.push(`Department changed from ${oldDepartment} to ${newDepartment}`);
    }
    const description = parts.join('. ');
    const today = new Date().toISOString().split('T')[0];

    return withTransaction(async (txQuery) => {
      // Close previous position and create new one atomically
      await this.closeCurrentPosition(employeeId, today, txQuery);

      const result = await txQuery(
        `INSERT INTO job_history (employee_id, role, department, start_date, end_date, description, created_by)
         VALUES ($1, $2, $3, $4, NULL, $5, $6)
         RETURNING *`,
        [employeeId, newRole, newDepartment, today, description, createdBy || null]
      );
      return this.mapRow(result.rows[0]);
    });
  }

  private async closeCurrentPosition(employeeId: string, endDate: string, txQuery?: TxQuery): Promise<void> {
    const q = txQuery || query;
    await q(
      `UPDATE job_history SET end_date = $1, updated_at = NOW()
       WHERE employee_id = $2 AND end_date IS NULL`,
      [endDate, employeeId]
    );
  }

  private mapRow(row: any): JobHistory {
    return {
      id: row.id,
      employeeId: row.employee_id,
      role: row.role,
      department: row.department,
      startDate: row.start_date,
      endDate: row.end_date || null,
      description: row.description || null,
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null,
      createdBy: row.created_by || null,
    };
  }
}

export default new JobHistoryService();
