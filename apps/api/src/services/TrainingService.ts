import { query } from '../db';
import { BusinessError } from '../utils/errorResponse';

export interface TrainingModule {
  id: string;
  title: string;
  description: string | null;
  duration: string;
  type: string;
  status: string;
  thumbnail: string | null;
  progress: number;
  createdBy: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeTraining {
  id: string;
  employeeId: string;
  moduleId: string | null;
  title: string;
  duration: string;
  status: string;
  completionDate: string | null;
  score: number | null;
  dueDate: string | null;
  assignedBy: string | null;
  assignedAt: string | null;
  type: string;
  thumbnail: string | null;
  moduleProgress: number;
}

export interface TrainingAnalytics {
  totalModules: number;
  activeModules: number;
  totalAssignments: number;
  completionRate: number;
  overdueCount: number;
  completionsByDepartment: Array<{ department: string; total: number; completed: number; rate: number }>;
  completionsByModule: Array<{ moduleId: string; title: string; total: number; completed: number; rate: number }>;
}

class TrainingService {
  // ========== MODULE CRUD ==========

  async getAllModules(includeInactive = false): Promise<TrainingModule[]> {
    const sql = includeInactive
      ? 'SELECT * FROM training_modules ORDER BY created_at DESC'
      : 'SELECT * FROM training_modules WHERE is_active = TRUE ORDER BY created_at DESC';
    const result = await query(sql);
    return result.rows.map(this.mapRowToModule);
  }

  async getModuleById(id: string): Promise<TrainingModule | null> {
    const result = await query('SELECT * FROM training_modules WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToModule(result.rows[0]);
  }

  async createModule(data: {
    title: string;
    description?: string;
    duration?: string;
    type?: string;
    thumbnail?: string;
    createdBy?: string;
  }): Promise<TrainingModule> {
    const result = await query(
      `INSERT INTO training_modules (title, description, duration, type, thumbnail, created_by, status, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, 'In Progress', TRUE)
       RETURNING *`,
      [data.title, data.description || null, data.duration || null, data.type || 'Course', data.thumbnail || null, data.createdBy || null]
    );
    return this.mapRowToModule(result.rows[0]);
  }

  async updateModule(id: string, data: {
    title?: string;
    description?: string;
    duration?: string;
    type?: string;
    status?: string;
    thumbnail?: string;
    isActive?: boolean;
  }): Promise<TrainingModule | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) { fields.push(`title = $${paramIndex++}`); values.push(data.title); }
    if (data.description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(data.description); }
    if (data.duration !== undefined) { fields.push(`duration = $${paramIndex++}`); values.push(data.duration); }
    if (data.type !== undefined) { fields.push(`type = $${paramIndex++}`); values.push(data.type); }
    if (data.status !== undefined) { fields.push(`status = $${paramIndex++}`); values.push(data.status); }
    if (data.thumbnail !== undefined) { fields.push(`thumbnail = $${paramIndex++}`); values.push(data.thumbnail); }
    if (data.isActive !== undefined) { fields.push(`is_active = $${paramIndex++}`); values.push(data.isActive); }

    if (fields.length === 0) return this.getModuleById(id);

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await query(
      `UPDATE training_modules SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return null;
    return this.mapRowToModule(result.rows[0]);
  }

  async deleteModule(id: string): Promise<void> {
    // Soft delete to preserve FK references from employee_training
    const result = await query(
      'UPDATE training_modules SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
      [id]
    );
    if (result.rowCount === 0) {
      throw new BusinessError('Training module not found');
    }
  }

  // ========== EMPLOYEE TRAINING ==========

  async getEmployeeTraining(employeeId: string): Promise<EmployeeTraining[]> {
    const result = await query(
      `SELECT et.*, tm.type, tm.thumbnail, tm.progress as module_progress
       FROM employee_training et
       LEFT JOIN training_modules tm ON et.module_id = tm.id
       WHERE et.employee_id = $1 AND et.deleted_at IS NULL
       ORDER BY et.created_at DESC NULLS LAST`,
      [employeeId]
    );
    return result.rows.map(this.mapRowToEmployeeTraining);
  }

  async assignTraining(data: {
    employeeId: string;
    moduleId?: string;
    title?: string;
    duration?: string;
    dueDate?: string;
    assignedBy?: string;
  }): Promise<EmployeeTraining> {
    let title = data.title || 'Untitled Training';
    let duration = data.duration || '1h';

    // If moduleId provided, pull title/duration from module
    if (data.moduleId) {
      const mod = await this.getModuleById(data.moduleId);
      if (mod) {
        title = mod.title;
        duration = mod.duration || duration;
      }
    }

    const result = await query(
      `INSERT INTO employee_training (employee_id, module_id, title, duration, status, due_date, assigned_by, assigned_at)
       VALUES ($1, $2, $3, $4, 'Not Started', $5, $6, NOW())
       RETURNING *`,
      [data.employeeId, data.moduleId || null, title, duration, data.dueDate || null, data.assignedBy || null]
    );

    // Re-fetch with JOIN
    const fetched = await query(
      `SELECT et.*, tm.type, tm.thumbnail, tm.progress as module_progress
       FROM employee_training et
       LEFT JOIN training_modules tm ON et.module_id = tm.id
       WHERE et.id = $1`,
      [result.rows[0].id]
    );
    return this.mapRowToEmployeeTraining(fetched.rows[0]);
  }

  async bulkAssignTraining(data: {
    employeeIds: string[];
    moduleId: string;
    dueDate?: string;
    assignedBy?: string;
  }): Promise<EmployeeTraining[]> {
    if (data.employeeIds.length === 0) {
      throw new BusinessError('At least one employee is required');
    }

    const mod = await this.getModuleById(data.moduleId);
    if (!mod) throw new BusinessError('Training module not found');

    // Build a single bulk INSERT with ON CONFLICT to skip duplicates
    // Uses the unique partial index on (employee_id, module_id) WHERE module_id IS NOT NULL
    const valuePlaceholders: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    for (const employeeId of data.employeeIds) {
      valuePlaceholders.push(
        `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, 'Not Started', $${paramIdx++}, $${paramIdx++}, NOW())`
      );
      params.push(employeeId, data.moduleId, mod.title, mod.duration, data.dueDate || null, data.assignedBy || null);
    }

    const result = await query(
      `INSERT INTO employee_training (employee_id, module_id, title, duration, status, due_date, assigned_by, assigned_at)
       VALUES ${valuePlaceholders.join(', ')}
       ON CONFLICT (employee_id, module_id) WHERE module_id IS NOT NULL DO NOTHING
       RETURNING *`,
      params
    );

    return result.rows.map(this.mapRowToEmployeeTraining);
  }

  async updateTraining(id: string, status?: string, score?: number): Promise<EmployeeTraining | null> {
    const completionDate = status === 'Completed' ? new Date() : null;
    const result = await query(
      `UPDATE employee_training
       SET status = COALESCE($1, status),
           score = COALESCE($2, score),
           completion_date = COALESCE($3, completion_date)
       WHERE id = $4
       RETURNING *`,
      [status, score, completionDate, id]
    );
    if (result.rows.length === 0) return null;

    const fetched = await query(
      `SELECT et.*, tm.type, tm.thumbnail, tm.progress as module_progress
       FROM employee_training et
       LEFT JOIN training_modules tm ON et.module_id = tm.id
       WHERE et.id = $1`,
      [id]
    );
    return this.mapRowToEmployeeTraining(fetched.rows[0]);
  }

  async deleteTraining(id: string): Promise<void> {
    // Soft delete — training completion records must be preserved for compliance
    // and certification audits; hard deletes could erase proof of employee training.
    const result = await query(
      'UPDATE employee_training SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    if (result.rowCount === 0) {
      throw new BusinessError('Training record not found');
    }
  }

  // ========== ANALYTICS ==========

  async getAnalytics(): Promise<TrainingAnalytics> {
    const modulesResult = await query(
      'SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active = TRUE) AS active FROM training_modules'
    );

    const assignmentsResult = await query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'Completed') AS completed,
              COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'Completed') AS overdue
       FROM employee_training
       WHERE deleted_at IS NULL`
    );

    const totalAssignments = parseInt(assignmentsResult.rows[0].total, 10);
    const completedCount = parseInt(assignmentsResult.rows[0].completed, 10);

    const byDeptResult = await query(
      `SELECT e.department,
              COUNT(et.id) AS total,
              COUNT(et.id) FILTER (WHERE et.status = 'Completed') AS completed
       FROM employee_training et
       JOIN employees e ON et.employee_id = e.id
       WHERE e.department IS NOT NULL AND et.deleted_at IS NULL
       GROUP BY e.department
       ORDER BY e.department`
    );

    const byModuleResult = await query(
      `SELECT et.module_id, COALESCE(tm.title, et.title) AS title,
              COUNT(et.id) AS total,
              COUNT(et.id) FILTER (WHERE et.status = 'Completed') AS completed
       FROM employee_training et
       LEFT JOIN training_modules tm ON et.module_id = tm.id
       WHERE et.deleted_at IS NULL
       GROUP BY et.module_id, COALESCE(tm.title, et.title)
       ORDER BY total DESC
       LIMIT 20`
    );

    return {
      totalModules: parseInt(modulesResult.rows[0].total, 10),
      activeModules: parseInt(modulesResult.rows[0].active, 10),
      totalAssignments,
      completionRate: totalAssignments > 0 ? Math.round((completedCount / totalAssignments) * 100) : 0,
      overdueCount: parseInt(assignmentsResult.rows[0].overdue, 10),
      completionsByDepartment: byDeptResult.rows.map(r => ({
        department: r.department,
        total: parseInt(r.total, 10),
        completed: parseInt(r.completed, 10),
        rate: parseInt(r.total, 10) > 0 ? Math.round((parseInt(r.completed, 10) / parseInt(r.total, 10)) * 100) : 0,
      })),
      completionsByModule: byModuleResult.rows.map(r => ({
        moduleId: r.module_id || '',
        title: r.title,
        total: parseInt(r.total, 10),
        completed: parseInt(r.completed, 10),
        rate: parseInt(r.total, 10) > 0 ? Math.round((parseInt(r.completed, 10) / parseInt(r.total, 10)) * 100) : 0,
      })),
    };
  }

  // ========== MAPPERS ==========

  private mapRowToModule(row: any): TrainingModule {
    return {
      id: row.id,
      title: row.title,
      description: row.description || null,
      duration: row.duration || '',
      type: row.type || 'Course',
      status: row.status || 'In Progress',
      thumbnail: row.thumbnail || null,
      progress: row.progress || 0,
      createdBy: row.created_by || null,
      isActive: row.is_active !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToEmployeeTraining(row: any): EmployeeTraining {
    return {
      id: row.id,
      employeeId: row.employee_id,
      moduleId: row.module_id || null,
      title: row.title,
      duration: row.duration || '',
      status: row.status || 'Not Started',
      completionDate: row.completion_date || null,
      score: row.score ?? null,
      dueDate: row.due_date || null,
      assignedBy: row.assigned_by || null,
      assignedAt: row.assigned_at || null,
      type: row.type || 'Course',
      thumbnail: row.thumbnail || null,
      moduleProgress: row.module_progress || 0,
    };
  }
}

export default new TrainingService();
