import { query } from '../db';
import { ExpenseClaim, CreateExpenseClaimDTO, UpdateExpenseClaimStatusDTO } from '../models/ExpenseClaim';
import { BusinessError } from '../utils/errorResponse';
import NotificationService from './NotificationService';

export class ExpenseClaimService {
    async getAllExpenseClaims(): Promise<ExpenseClaim[]> {
        const result = await query(
            `SELECT ec.*, e.name AS employee_name, e.avatar
             FROM expense_claims ec
             JOIN employees e ON ec.employee_id = e.id
             WHERE ec.deleted_at IS NULL
             ORDER BY ec.created_at DESC`
        );
        return result.rows.map(this.mapRowToExpenseClaim);
    }

    async getExpenseClaimById(id: string): Promise<ExpenseClaim | null> {
        const result = await query(
            `SELECT ec.*, e.name AS employee_name, e.avatar
             FROM expense_claims ec
             JOIN employees e ON ec.employee_id = e.id
             WHERE ec.id = $1 AND ec.deleted_at IS NULL`,
            [id]
        );
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToExpenseClaim(result.rows[0]);
    }

    async createExpenseClaim(data: CreateExpenseClaimDTO): Promise<ExpenseClaim> {
        const { employeeId, title, category, amount, expenseDate, description, receiptPath } = data;

        const result = await query(
            `INSERT INTO expense_claims (employee_id, title, category, amount, expense_date, description, receipt_path)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [employeeId, title, category, amount, expenseDate, description || null, receiptPath || null]
        );

        // Re-fetch with employee join to get employee_name and avatar
        const claim = await this.getExpenseClaimById(result.rows[0].id);
        return claim!;
    }

    async updateExpenseClaimStatus(id: string, data: UpdateExpenseClaimStatusDTO): Promise<ExpenseClaim | null> {
        const { status, rejectionReason, approverEmployeeId } = data;

        const result = await query(
            `UPDATE expense_claims
             SET status = $1, rejection_reason = $2, approver_id = $3, updated_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [status, rejectionReason || null, approverEmployeeId || null, id]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return this.getExpenseClaimById(id);
    }

    async editExpenseClaim(id: string, employeeId: string, updates: Partial<CreateExpenseClaimDTO>): Promise<ExpenseClaim | null> {
        // Verify ownership and pending status (exclude soft-deleted)
        const existing = await query(
            'SELECT id, employee_id, title, category, amount, currency, expense_date, description, receipt_path, status, rejection_reason, approver_id, manager_reviewed_by, manager_reviewed_at, created_at, updated_at FROM expense_claims WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );

        if (existing.rows.length === 0) {
            return null;
        }

        const claim = existing.rows[0];
        if (claim.employee_id !== employeeId) {
            throw new BusinessError('You can only edit your own expense claims');
        }
        if (claim.status !== 'Pending') {
            throw new BusinessError('Only pending expense claims can be edited');
        }

        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.title !== undefined) {
            fields.push(`title = $${paramIndex++}`);
            values.push(updates.title);
        }
        if (updates.category !== undefined) {
            fields.push(`category = $${paramIndex++}`);
            values.push(updates.category);
        }
        if (updates.amount !== undefined) {
            fields.push(`amount = $${paramIndex++}`);
            values.push(updates.amount);
        }
        if (updates.expenseDate !== undefined) {
            fields.push(`expense_date = $${paramIndex++}`);
            values.push(updates.expenseDate);
        }
        if (updates.description !== undefined) {
            fields.push(`description = $${paramIndex++}`);
            values.push(updates.description);
        }
        if (updates.receiptPath !== undefined) {
            fields.push(`receipt_path = $${paramIndex++}`);
            values.push(updates.receiptPath);
        }

        if (fields.length === 0) {
            return this.getExpenseClaimById(id);
        }

        fields.push('updated_at = NOW()');
        values.push(id);

        await query(
            `UPDATE expense_claims SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
            values
        );

        return this.getExpenseClaimById(id);
    }

    async cancelExpenseClaim(id: string, employeeId: string): Promise<ExpenseClaim | null> {
        const existing = await query(
            'SELECT id, employee_id, title, category, amount, currency, expense_date, description, receipt_path, status, rejection_reason, approver_id, manager_reviewed_by, manager_reviewed_at, created_at, updated_at FROM expense_claims WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );

        if (existing.rows.length === 0) {
            return null;
        }

        const claim = existing.rows[0];
        if (claim.employee_id !== employeeId) {
            throw new BusinessError('You can only cancel your own expense claims');
        }

        if (claim.status === 'Pending') {
            // Soft delete — HR financial records must never be permanently removed.
            // Set both deleted_at and status so the record is clearly marked as cancelled
            // and excluded from all active queries.
            await query(
                `UPDATE expense_claims
                 SET deleted_at = NOW(), status = 'Cancelled', updated_at = NOW()
                 WHERE id = $1`,
                [id]
            );
            return this.mapRowToExpenseClaim({ ...claim, status: 'Cancelled' });
        } else if (claim.status === 'Approved') {
            // Soft cancel for approved claims
            await query(
                `UPDATE expense_claims SET status = 'Cancelled', updated_at = NOW() WHERE id = $1`,
                [id]
            );
            return this.getExpenseClaimById(id);
        } else {
            throw new BusinessError('Only pending or approved expense claims can be cancelled');
        }
    }

    async managerApprove(id: string, managerEmployeeId: string): Promise<ExpenseClaim> {
        const existing = await query(
            'SELECT id, employee_id, title, category, amount, currency, expense_date, description, receipt_path, status, rejection_reason, approver_id, manager_reviewed_by, manager_reviewed_at, created_at, updated_at FROM expense_claims WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );
        if (existing.rows.length === 0) throw new BusinessError('Expense claim not found');

        const claim = existing.rows[0];
        if (claim.status !== 'Pending') throw new BusinessError('Only pending expense claims can be manager-approved');

        // Verify manager is a direct manager of the employee
        const empCheck = await query(
            'SELECT manager_id, name FROM employees WHERE id = $1',
            [claim.employee_id]
        );
        if (empCheck.rows[0]?.manager_id !== managerEmployeeId) {
            throw new BusinessError('You can only approve expense claims from your direct reports');
        }

        const result = await query(
            `UPDATE expense_claims
             SET status = 'Manager Approved', manager_reviewed_by = $1, manager_reviewed_at = NOW(), updated_at = NOW()
             WHERE id = $2 RETURNING *`,
            [managerEmployeeId, id]
        );

        // Notify HR admins for final approval
        const empName = empCheck.rows[0]?.name ?? 'An employee';
        NotificationService.notifyAdmins({
            title: 'Expense Claim Ready for Final Approval',
            message: `Manager approved ${empName}'s expense claim "${claim.title}" (฿${claim.amount}). Needs final approval.`,
            type: 'info',
            link: '/expenses',
        }).catch(() => {});

        return this.getExpenseClaimById(result.rows[0].id) as Promise<ExpenseClaim>;
    }

    async getManagerQueue(managerEmployeeId: string): Promise<ExpenseClaim[]> {
        const result = await query(
            `SELECT ec.*, e.name AS employee_name, e.avatar
             FROM expense_claims ec
             JOIN employees e ON ec.employee_id = e.id
             WHERE e.manager_id = $1 AND ec.status = 'Pending' AND ec.deleted_at IS NULL
             ORDER BY ec.created_at DESC`,
            [managerEmployeeId]
        );
        return result.rows.map(this.mapRowToExpenseClaim);
    }

    async deleteExpenseClaim(id: string): Promise<void> {
        // Soft delete — expense records must be preserved for financial audit
        const result = await query(
            `UPDATE expense_claims
             SET deleted_at = NOW(), updated_at = NOW()
             WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );
        if (result.rowCount === 0) {
            throw new BusinessError('Expense claim not found');
        }
    }

    async getEmployeeSummary(employeeId: string): Promise<{
        totalReimbursed: number;
        pendingCount: number;
        pendingAmount: number;
        thisMonthCount: number;
    }> {
        const reimbursedResult = await query(
            `SELECT COALESCE(SUM(amount), 0) AS total
             FROM expense_claims
             WHERE employee_id = $1 AND status = 'Reimbursed' AND deleted_at IS NULL`,
            [employeeId]
        );

        const pendingResult = await query(
            `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
             FROM expense_claims
             WHERE employee_id = $1 AND status = 'Pending' AND deleted_at IS NULL`,
            [employeeId]
        );

        const thisMonthResult = await query(
            `SELECT COUNT(*) AS count
             FROM expense_claims
             WHERE employee_id = $1
               AND created_at >= date_trunc('month', CURRENT_DATE)
               AND deleted_at IS NULL`,
            [employeeId]
        );

        return {
            totalReimbursed: parseFloat(reimbursedResult.rows[0].total),
            pendingCount: parseInt(pendingResult.rows[0].count, 10),
            pendingAmount: parseFloat(pendingResult.rows[0].total),
            thisMonthCount: parseInt(thisMonthResult.rows[0].count, 10),
        };
    }

    async getAdminSummary(): Promise<{
        pendingCount: number;
        pendingAmount: number;
        monthReimbursed: number;
    }> {
        const pendingResult = await query(
            `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
             FROM expense_claims
             WHERE status = 'Pending' AND deleted_at IS NULL`
        );

        const reimbursedResult = await query(
            `SELECT COALESCE(SUM(amount), 0) AS total
             FROM expense_claims
             WHERE status = 'Reimbursed'
               AND updated_at >= date_trunc('month', CURRENT_DATE)
               AND deleted_at IS NULL`
        );

        return {
            pendingCount: parseInt(pendingResult.rows[0].count, 10),
            pendingAmount: parseFloat(pendingResult.rows[0].total),
            monthReimbursed: parseFloat(reimbursedResult.rows[0].total),
        };
    }

    private mapRowToExpenseClaim(row: any): ExpenseClaim {
        return {
            id: row.id,
            employeeId: row.employee_id,
            employeeName: row.employee_name || '',
            avatar: row.avatar || '',
            title: row.title,
            category: row.category,
            amount: parseFloat(row.amount),
            currency: row.currency || 'THB',
            expenseDate: row.expense_date,
            description: row.description || undefined,
            receiptPath: row.receipt_path || undefined,
            status: row.status,
            rejectionReason: row.rejection_reason || undefined,
            approverEmployeeId: row.approver_id || undefined,
            managerReviewedBy: row.manager_reviewed_by || undefined,
            managerReviewedAt: row.manager_reviewed_at || undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}

export default new ExpenseClaimService();
