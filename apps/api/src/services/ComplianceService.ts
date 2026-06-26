import { query } from '../db';
import { BusinessError } from '../utils/errorResponse';
import NotificationService from './NotificationService';
import logger from '../utils/logger';

export interface ComplianceItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: string;
  riskLevel: string;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedDepartment: string | null;
  dueDate: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceEvidence {
  id: string;
  complianceItemId: string;
  filePath: string;
  fileName: string;
  fileSize: number | null;
  uploadedBy: string | null;
  createdAt: string;
}

export interface ComplianceStatusHistory {
  id: string;
  complianceItemId: string;
  oldStatus: string | null;
  newStatus: string;
  changedBy: string | null;
  changedByEmail: string | null;
  reason: string | null;
  createdAt: string;
}

export interface ComplianceFilters {
  status?: string;
  category?: string;
  priority?: string;
  riskLevel?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
}

class ComplianceService {
  // ========== CRUD ==========

  async getAll(filters: ComplianceFilters = {}): Promise<{ items: ComplianceItem[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.status) { conditions.push(`ci.status = $${paramIndex++}`); values.push(filters.status); }
    if (filters.category) { conditions.push(`ci.category = $${paramIndex++}`); values.push(filters.category); }
    if (filters.priority) { conditions.push(`ci.priority = $${paramIndex++}`); values.push(filters.priority); }
    if (filters.riskLevel) { conditions.push(`ci.risk_level = $${paramIndex++}`); values.push(filters.riskLevel); }
    if (filters.assignedTo) { conditions.push(`ci.assigned_to = $${paramIndex++}`); values.push(filters.assignedTo); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM compliance_items ci ${where}`,
      values
    );

    const dataResult = await query(
      `SELECT ci.*, e.name AS assigned_to_name
       FROM compliance_items ci
       LEFT JOIN employees e ON ci.assigned_to = e.id
       ${where}
       ORDER BY
         CASE ci.status WHEN 'Overdue' THEN 0 WHEN 'In Progress' THEN 1 WHEN 'Active' THEN 2 WHEN 'Draft' THEN 3 ELSE 4 END,
         ci.due_date ASC NULLS LAST,
         ci.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...values, limit, offset]
    );

    return {
      items: dataResult.rows.map(this.mapRowToItem),
      total: parseInt(countResult.rows[0].total, 10),
    };
  }

  async getById(id: string): Promise<ComplianceItem | null> {
    const result = await query(
      `SELECT ci.*, e.name AS assigned_to_name
       FROM compliance_items ci
       LEFT JOIN employees e ON ci.assigned_to = e.id
       WHERE ci.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return null;
    return this.mapRowToItem(result.rows[0]);
  }

  async create(data: {
    title: string;
    description?: string;
    category?: string;
    priority?: string;
    riskLevel?: string;
    assignedTo?: string;
    assignedDepartment?: string;
    dueDate?: string;
    createdBy: string;
  }): Promise<ComplianceItem> {
    const result = await query(
      `INSERT INTO compliance_items (title, description, category, priority, risk_level, assigned_to, assigned_department, due_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.title,
        data.description || null,
        data.category || 'Custom',
        data.priority || 'Medium',
        data.riskLevel || 'Low',
        data.assignedTo || null,
        data.assignedDepartment || null,
        data.dueDate || null,
        data.createdBy,
      ]
    );

    // Record initial status history
    await query(
      `INSERT INTO compliance_status_history (compliance_item_id, old_status, new_status, changed_by)
       VALUES ($1, NULL, 'Draft', $2)`,
      [result.rows[0].id, data.createdBy]
    );

    return (await this.getById(result.rows[0].id))!;
  }

  async update(id: string, data: {
    title?: string;
    description?: string;
    category?: string;
    priority?: string;
    riskLevel?: string;
    assignedTo?: string | null;
    assignedDepartment?: string | null;
    dueDate?: string | null;
  }): Promise<ComplianceItem | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) { fields.push(`title = $${paramIndex++}`); values.push(data.title); }
    if (data.description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(data.description); }
    if (data.category !== undefined) { fields.push(`category = $${paramIndex++}`); values.push(data.category); }
    if (data.priority !== undefined) { fields.push(`priority = $${paramIndex++}`); values.push(data.priority); }
    if (data.riskLevel !== undefined) { fields.push(`risk_level = $${paramIndex++}`); values.push(data.riskLevel); }
    if (data.assignedTo !== undefined) { fields.push(`assigned_to = $${paramIndex++}`); values.push(data.assignedTo); }
    if (data.assignedDepartment !== undefined) { fields.push(`assigned_department = $${paramIndex++}`); values.push(data.assignedDepartment); }
    if (data.dueDate !== undefined) { fields.push(`due_date = $${paramIndex++}`); values.push(data.dueDate); }

    if (fields.length === 0) return existing;

    fields.push('updated_at = NOW()');
    values.push(id);

    await query(
      `UPDATE compliance_items SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    return this.getById(id);
  }

  async delete(id: string): Promise<void> {
    const result = await query('DELETE FROM compliance_items WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      throw new BusinessError('Compliance item not found');
    }
  }

  // ========== STATUS WORKFLOW ==========

  async updateStatus(id: string, newStatus: string, userId: string, reason?: string): Promise<ComplianceItem | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const validStatuses = ['Draft', 'Active', 'In Progress', 'Completed', 'Overdue'];
    if (!validStatuses.includes(newStatus)) {
      throw new BusinessError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    await query(
      'UPDATE compliance_items SET status = $1, updated_at = NOW() WHERE id = $2',
      [newStatus, id]
    );

    // Record status change
    await query(
      `INSERT INTO compliance_status_history (compliance_item_id, old_status, new_status, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, existing.status, newStatus, userId, reason || null]
    );

    // Notify the assigned employee about status change
    if (existing.assignedTo) {
      const empResult = await query(
        `SELECT user_id FROM employees WHERE id = $1`,
        [existing.assignedTo]
      );
      if (empResult.rows[0]?.user_id) {
        NotificationService.create({
          user_id: empResult.rows[0].user_id,
          title: 'Compliance Status Updated',
          message: `"${existing.title}" status changed from ${existing.status} to ${newStatus}.${reason ? ` Reason: ${reason}` : ''}`,
          type: newStatus === 'Completed' ? 'success' : newStatus === 'Overdue' ? 'warning' : 'info',
          link: '/compliance',
        }).catch((err) => logger.error(err, 'Failed to notify about compliance status change:'));
      }
    }

    return this.getById(id);
  }

  async markOverdueItems(): Promise<number> {
    const result = await query(
      `UPDATE compliance_items
       SET status = 'Overdue', updated_at = NOW()
       WHERE status IN ('Active', 'In Progress')
         AND due_date < CURRENT_DATE
       RETURNING id`
    );

    // Record status changes for each overdue item
    for (const row of result.rows) {
      await query(
        `INSERT INTO compliance_status_history (compliance_item_id, old_status, new_status, reason)
         VALUES ($1, 'Active', 'Overdue', 'Automatically marked overdue - past due date')`,
        [row.id]
      );
    }

    return result.rowCount || 0;
  }

  // ========== EVIDENCE ==========

  async addEvidence(itemId: string, filePath: string, fileName: string, fileSize: number, uploadedBy: string): Promise<ComplianceEvidence> {
    const item = await this.getById(itemId);
    if (!item) throw new BusinessError('Compliance item not found');

    const result = await query(
      `INSERT INTO compliance_evidence (compliance_item_id, file_path, file_name, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [itemId, filePath, fileName, fileSize, uploadedBy]
    );
    return this.mapRowToEvidence(result.rows[0]);
  }

  async getEvidence(itemId: string): Promise<ComplianceEvidence[]> {
    const result = await query(
      'SELECT id, compliance_item_id, file_path, file_name, file_size, uploaded_by, created_at FROM compliance_evidence WHERE compliance_item_id = $1 ORDER BY created_at DESC',
      [itemId]
    );
    return result.rows.map(this.mapRowToEvidence);
  }

  async deleteEvidence(evidenceId: string): Promise<string> {
    const result = await query(
      'DELETE FROM compliance_evidence WHERE id = $1 RETURNING file_path',
      [evidenceId]
    );
    if (result.rowCount === 0) {
      throw new BusinessError('Evidence not found');
    }
    return result.rows[0].file_path;
  }

  // ========== STATUS HISTORY ==========

  async getStatusHistory(itemId: string): Promise<ComplianceStatusHistory[]> {
    const result = await query(
      `SELECT csh.*, u.email AS changed_by_email
       FROM compliance_status_history csh
       LEFT JOIN users u ON csh.changed_by = u.id
       WHERE csh.compliance_item_id = $1
       ORDER BY csh.created_at DESC`,
      [itemId]
    );
    return result.rows.map(this.mapRowToStatusHistory);
  }

  // ========== MAPPERS ==========

  private mapRowToItem(row: any): ComplianceItem {
    return {
      id: row.id,
      title: row.title,
      description: row.description || null,
      category: row.category,
      status: row.status,
      priority: row.priority,
      riskLevel: row.risk_level,
      assignedTo: row.assigned_to || null,
      assignedToName: row.assigned_to_name || null,
      assignedDepartment: row.assigned_department || null,
      dueDate: row.due_date || null,
      createdBy: row.created_by || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToEvidence(row: any): ComplianceEvidence {
    return {
      id: row.id,
      complianceItemId: row.compliance_item_id,
      filePath: row.file_path,
      fileName: row.file_name,
      fileSize: row.file_size ? parseInt(row.file_size, 10) : null,
      uploadedBy: row.uploaded_by || null,
      createdAt: row.created_at,
    };
  }

  private mapRowToStatusHistory(row: any): ComplianceStatusHistory {
    return {
      id: row.id,
      complianceItemId: row.compliance_item_id,
      oldStatus: row.old_status || null,
      newStatus: row.new_status,
      changedBy: row.changed_by || null,
      changedByEmail: row.changed_by_email || null,
      reason: row.reason || null,
      createdAt: row.created_at,
    };
  }
}

export default new ComplianceService();
