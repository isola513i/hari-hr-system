import { query } from '../db';
import { BusinessError } from '../utils/errorResponse';
import NotificationService from './NotificationService';
import AuditLogService from './AuditLogService';

export interface AuditContext {
  userId: string;
  email: string;
  ip: string;
  userAgent: string;
  method: string;
  path: string;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeAvatar?: string;
  date: string;
  reviewer: string;
  reviewerUserId: string | null;
  rating: number | null;
  notes: string;
  status: 'draft' | 'submitted' | 'manager_reviewed' | 'completed' | 'rejected';
  selfReview: string | null;
  managerComment: string | null;
  hrComment: string | null;
  reviewPeriod: string | null;
  managerReviewedBy: string | null;
  managerReviewedAt: string | null;
  hrReviewedBy: string | null;
  hrReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewData {
  employeeId: string;
  date: string;
  reviewer: string;
  reviewerUserId: string;
  rating?: number;
  notes?: string;
  reviewPeriod?: string;
  selfReview?: string;
}

export class PerformanceService {
  async list(filters: {
    employeeId?: string;
    role: string;
    callerEmployeeId?: string;
    status?: string;
    reviewPeriod?: string;
  }): Promise<PerformanceReview[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (filters.employeeId) {
      conditions.push(`pr.employee_id = $${i++}`);
      params.push(filters.employeeId);
    }
    if (filters.status) {
      conditions.push(`pr.status = $${i++}`);
      params.push(filters.status);
    }
    if (filters.reviewPeriod) {
      conditions.push(`pr.review_period = $${i++}`);
      params.push(filters.reviewPeriod);
    }
    // Manager: only sees direct reports
    if (filters.role === 'MANAGER' && filters.callerEmployeeId && !filters.employeeId) {
      conditions.push(`e.manager_id = $${i++}`);
      params.push(filters.callerEmployeeId);
    }
    // Employee: only sees own reviews
    if (filters.role === 'EMPLOYEE' && filters.callerEmployeeId && !filters.employeeId) {
      conditions.push(`pr.employee_id = $${i++}`);
      params.push(filters.callerEmployeeId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT pr.*, e.name AS employee_name, e.avatar AS employee_avatar
       FROM performance_reviews pr
       JOIN employees e ON pr.employee_id = e.id
       ${where}
       ORDER BY pr.created_at DESC, pr.date DESC`,
      params
    );

    return result.rows.map(this.mapRow);
  }

  async get(id: string): Promise<PerformanceReview> {
    const result = await query(
      `SELECT pr.*, e.name AS employee_name, e.avatar AS employee_avatar
       FROM performance_reviews pr
       JOIN employees e ON pr.employee_id = e.id
       WHERE pr.id = $1`,
      [id]
    );
    if (!result.rows[0]) throw new BusinessError('Performance review not found');
    return this.mapRow(result.rows[0]);
  }

  async create(data: CreateReviewData, audit?: AuditContext): Promise<PerformanceReview> {
    const { employeeId, date, reviewer, reviewerUserId, rating, notes, reviewPeriod, selfReview } = data;

    // Prevent self-review when reviewer is the same user
    const empCheck = await query('SELECT user_id FROM employees WHERE id = $1', [employeeId]);
    if (empCheck.rows[0]?.user_id === reviewerUserId) {
      throw new BusinessError('You cannot review yourself');
    }

    const result = await query(
      `INSERT INTO performance_reviews
         (employee_id, date, reviewer, reviewer_user_id, rating, notes, review_period, self_review, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [
        employeeId, date, reviewer, reviewerUserId,
        rating ?? null, notes ?? '',
        reviewPeriod ?? null, selfReview ?? null,
        selfReview ? 'submitted' : 'completed',
      ]
    );

    const row = result.rows[0];

    if (audit) {
      AuditLogService.create({
        userId:    audit.userId,
        userEmail: audit.email,
        action:    'PERFORMANCE_REVIEW_CREATED',
        resource:  `performance_review:${row.id}`,
        method:    audit.method,
        path:      audit.path,
        ip:        audit.ip,
        userAgent: audit.userAgent,
        success:   true,
        details:   { employeeId, rating: rating ?? null, reviewPeriod: reviewPeriod ?? null },
      }).catch((err) => console.error('Performance review created audit log failed:', err));
    }

    // Notify employee
    if (empCheck.rows[0]?.user_id) {
      NotificationService.create({
        user_id: empCheck.rows[0].user_id,
        title: 'New Performance Review',
        message: `${reviewer} has submitted a performance review for you${rating ? ` (${rating}/5)` : ''}.`,
        type: 'info',
        link: '/performance-reviews',
      }).catch(() => {});
    }

    return this.mapRow(row);
  }

  async createSelfReview(data: {
    employeeId: string;
    selfReview: string;
    reviewPeriod?: string;
    callerUserId: string;
    audit?: AuditContext;
  }): Promise<PerformanceReview> {
    const { employeeId, selfReview, reviewPeriod, callerUserId, audit } = data;

    // Verify caller is the employee
    const empCheck = await query('SELECT user_id, name, manager_id FROM employees WHERE id = $1', [employeeId]);
    if (!empCheck.rows[0] || empCheck.rows[0].user_id !== callerUserId) {
      throw new BusinessError('You can only submit your own self-review');
    }

    const result = await query(
      `INSERT INTO performance_reviews
         (employee_id, date, reviewer, reviewer_user_id, self_review, review_period, status, created_at, updated_at)
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, 'draft', NOW(), NOW())
       RETURNING *`,
      [employeeId, empCheck.rows[0].name, callerUserId, selfReview, reviewPeriod ?? null]
    );

    if (audit) {
      AuditLogService.create({
        userId:    audit.userId,
        userEmail: audit.email,
        action:    'SELF_REVIEW_CREATED',
        resource:  `performance_review:${result.rows[0].id}`,
        method:    audit.method,
        path:      audit.path,
        ip:        audit.ip,
        userAgent: audit.userAgent,
        success:   true,
        details:   { employeeId, reviewPeriod: reviewPeriod ?? null },
      }).catch((err) => console.error('Self-review created audit log failed:', err));
    }

    return this.mapRow(result.rows[0]);
  }

  async submitSelfReview(id: string, callerUserId: string, audit?: AuditContext): Promise<PerformanceReview> {
    const existing = await query('SELECT id, employee_id, reviewer_user_id, status FROM performance_reviews WHERE id = $1', [id]);
    if (!existing.rows[0]) throw new BusinessError('Review not found');
    const row = existing.rows[0];
    if (row.status !== 'draft') throw new BusinessError('Only draft reviews can be submitted');

    // Verify caller owns this review
    const empCheck = await query(
      'SELECT user_id, name, manager_id FROM employees WHERE id = $1',
      [row.employee_id]
    );
    if (empCheck.rows[0]?.user_id !== callerUserId) {
      throw new BusinessError('You can only submit your own review');
    }

    const result = await query(
      `UPDATE performance_reviews SET status = 'submitted', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );

    if (audit) {
      AuditLogService.create({
        userId:    audit.userId,
        userEmail: audit.email,
        action:    'SELF_REVIEW_SUBMITTED',
        resource:  `performance_review:${id}`,
        method:    audit.method,
        path:      audit.path,
        ip:        audit.ip,
        userAgent: audit.userAgent,
        success:   true,
        details:   { reviewId: id, employeeId: existing.rows[0].employee_id },
      }).catch((err) => console.error('Self-review submitted audit log failed:', err));
    }

    // Notify manager
    if (empCheck.rows[0]?.manager_id) {
      const mgrUser = await query('SELECT user_id FROM employees WHERE id = $1', [empCheck.rows[0].manager_id]);
      if (mgrUser.rows[0]?.user_id) {
        NotificationService.create({
          user_id: mgrUser.rows[0].user_id,
          title: 'Self-Review Submitted',
          message: `${empCheck.rows[0].name} has submitted their self-review and needs your evaluation.`,
          type: 'info',
          link: '/performance-reviews',
        }).catch(() => {});
      }
    }

    return this.mapRow(result.rows[0]);
  }

  async managerReview(data: {
    id: string;
    rating: number;
    managerComment: string;
    managerUserId: string;
    managerEmployeeId: string;
    audit?: AuditContext;
  }): Promise<PerformanceReview> {
    const { id, rating, managerComment, managerUserId, managerEmployeeId, audit } = data;

    const existing = await query('SELECT id, employee_id, reviewer_user_id, status FROM performance_reviews WHERE id = $1', [id]);
    if (!existing.rows[0]) throw new BusinessError('Review not found');
    const row = existing.rows[0];

    if (!['submitted', 'draft', 'completed'].includes(row.status)) {
      throw new BusinessError('Review is not in a state that can be manager-reviewed');
    }

    // Verify manager is a direct manager of this employee
    const empCheck = await query(
      'SELECT user_id, manager_id, name FROM employees WHERE id = $1',
      [row.employee_id]
    );
    if (empCheck.rows[0]?.manager_id !== managerEmployeeId) {
      throw new BusinessError('You can only review your direct reports');
    }

    const result = await query(
      `UPDATE performance_reviews
       SET status = 'manager_reviewed',
           rating = $1,
           manager_comment = $2,
           manager_reviewed_by = $3,
           manager_reviewed_at = NOW(),
           reviewer = (SELECT name FROM employees WHERE id = $4),
           reviewer_user_id = $3,
           updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [rating, managerComment, managerUserId, managerEmployeeId, id]
    );

    if (audit) {
      AuditLogService.create({
        userId:    audit.userId,
        userEmail: audit.email,
        action:    'PERFORMANCE_REVIEW_MANAGER_REVIEWED',
        resource:  `performance_review:${id}`,
        method:    audit.method,
        path:      audit.path,
        ip:        audit.ip,
        userAgent: audit.userAgent,
        success:   true,
        details:   { reviewId: id, employeeId: row.employee_id, rating, previousStatus: row.status },
      }).catch((err) => console.error('Manager review audit log failed:', err));
    }

    // Notify HR admins
    NotificationService.notifyAdmins({
      title: 'Performance Review Needs HR Approval',
      message: `Manager has reviewed ${empCheck.rows[0]?.name}'s performance (${rating}/5). Ready for HR finalization.`,
      type: 'info',
      link: '/performance-reviews',
    }).catch(() => {});

    return this.mapRow(result.rows[0]);
  }

  async hrApprove(data: {
    id: string;
    hrComment?: string;
    hrUserId: string;
    audit?: AuditContext;
  }): Promise<PerformanceReview> {
    const { id, hrComment, hrUserId, audit } = data;

    const existing = await query('SELECT id, employee_id, reviewer_user_id, status FROM performance_reviews WHERE id = $1', [id]);
    if (!existing.rows[0]) throw new BusinessError('Review not found');

    const result = await query(
      `UPDATE performance_reviews
       SET status = 'completed',
           hr_comment = $1,
           hr_reviewed_by = $2,
           hr_reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [hrComment ?? null, hrUserId, id]
    );

    if (audit) {
      AuditLogService.create({
        userId:    audit.userId,
        userEmail: audit.email,
        action:    'PERFORMANCE_REVIEW_HR_APPROVED',
        resource:  `performance_review:${id}`,
        method:    audit.method,
        path:      audit.path,
        ip:        audit.ip,
        userAgent: audit.userAgent,
        success:   true,
        details:   { reviewId: id, employeeId: existing.rows[0].employee_id, rating: result.rows[0].rating },
      }).catch((err) => console.error('HR approve audit log failed:', err));
    }

    // Notify employee
    const empUser = await query('SELECT user_id FROM employees WHERE id = $1', [existing.rows[0].employee_id]);
    if (empUser.rows[0]?.user_id) {
      NotificationService.create({
        user_id: empUser.rows[0].user_id,
        title: 'Performance Review Completed',
        message: 'Your performance review has been finalized by HR. You can view the results now.',
        type: 'success',
        link: '/performance-reviews',
      }).catch(() => {});
    }

    return this.mapRow(result.rows[0]);
  }

  async reject(data: {
    id: string;
    reason?: string;
    callerUserId: string;
    role: string;
    audit?: AuditContext;
  }): Promise<PerformanceReview> {
    const { id, reason, callerUserId, role, audit } = data;

    if (!['HR_ADMIN', 'MANAGER'].includes(role)) {
      throw new BusinessError('Only managers and HR admins can reject reviews');
    }

    const result = await query(
      `UPDATE performance_reviews
       SET status = 'rejected',
           hr_comment = $1,
           hr_reviewed_by = $2,
           hr_reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [reason ?? null, callerUserId, id]
    );
    if (!result.rows[0]) throw new BusinessError('Review not found');

    if (audit) {
      AuditLogService.create({
        userId:    audit.userId,
        userEmail: audit.email,
        action:    'PERFORMANCE_REVIEW_REJECTED',
        resource:  `performance_review:${id}`,
        method:    audit.method,
        path:      audit.path,
        ip:        audit.ip,
        userAgent: audit.userAgent,
        success:   true,
        details:   { reviewId: id, employeeId: result.rows[0].employee_id, reason: reason ?? null, byRole: role },
      }).catch((err) => console.error('Review rejected audit log failed:', err));
    }

    // Notify employee
    const empUser = await query('SELECT user_id FROM employees WHERE id = $1', [result.rows[0].employee_id]);
    if (empUser.rows[0]?.user_id) {
      NotificationService.create({
        user_id: empUser.rows[0].user_id,
        title: 'Performance Review Needs Revision',
        message: 'Your performance review has been sent back for revision.',
        type: 'warning',
        link: '/performance-reviews',
      }).catch(() => {});
    }

    return this.mapRow(result.rows[0]);
  }

  async update(id: string, data: { rating?: number; notes?: string; reviewer?: string; date?: string }, callerUserId: string, role: string, audit?: AuditContext): Promise<PerformanceReview> {
    if (role !== 'HR_ADMIN') {
      const existing = await query('SELECT reviewer_user_id, status FROM performance_reviews WHERE id = $1', [id]);
      if (!existing.rows[0] || existing.rows[0].reviewer_user_id !== callerUserId) {
        throw new BusinessError('You can only edit your own reviews');
      }
      if (!['draft', 'completed'].includes(existing.rows[0].status)) {
        throw new BusinessError('Only draft or completed reviews can be edited');
      }
    }

    const result = await query(
      `UPDATE performance_reviews
       SET rating = COALESCE($1, rating),
           notes = COALESCE($2, notes),
           reviewer = COALESCE($3, reviewer),
           date = COALESCE($4, date),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [data.rating, data.notes, data.reviewer, data.date, id]
    );
    if (!result.rows[0]) throw new BusinessError('Review not found');

    if (audit) {
      AuditLogService.create({
        userId:    audit.userId,
        userEmail: audit.email,
        action:    'PERFORMANCE_REVIEW_UPDATED',
        resource:  `performance_review:${id}`,
        method:    audit.method,
        path:      audit.path,
        ip:        audit.ip,
        userAgent: audit.userAgent,
        success:   true,
        details:   { reviewId: id, changedFields: Object.keys(data).filter((k) => data[k as keyof typeof data] !== undefined) },
      }).catch((err) => console.error('Review updated audit log failed:', err));
    }

    return this.mapRow(result.rows[0]);
  }

  async delete(id: string, callerUserId: string, role: string, audit?: AuditContext): Promise<void> {
    if (role !== 'HR_ADMIN') {
      const existing = await query('SELECT reviewer_user_id FROM performance_reviews WHERE id = $1', [id]);
      if (!existing.rows[0] || existing.rows[0].reviewer_user_id !== callerUserId) {
        throw new BusinessError('You can only delete your own reviews');
      }
    }
    const result = await query('DELETE FROM performance_reviews WHERE id = $1 RETURNING id, employee_id', [id]);
    if (!result.rows[0]) throw new BusinessError('Review not found');

    if (audit) {
      AuditLogService.create({
        userId:    audit.userId,
        userEmail: audit.email,
        action:    'PERFORMANCE_REVIEW_DELETED',
        resource:  `performance_review:${id}`,
        method:    audit.method,
        path:      audit.path,
        ip:        audit.ip,
        userAgent: audit.userAgent,
        success:   true,
        details:   { reviewId: id, employeeId: result.rows[0].employee_id },
      }).catch((err) => console.error('Review deleted audit log failed:', err));
    }
  }

  private mapRow(row: Record<string, unknown>): PerformanceReview {
    return {
      id: row.id as string,
      employeeId: row.employee_id as string,
      employeeName: row.employee_name as string | undefined,
      employeeAvatar: row.employee_avatar as string | undefined,
      date: row.date as string,
      reviewer: row.reviewer as string,
      reviewerUserId: row.reviewer_user_id as string | null,
      rating: row.rating as number | null,
      notes: (row.notes as string) || '',
      status: (row.status as PerformanceReview['status']) || 'completed',
      selfReview: row.self_review as string | null,
      managerComment: row.manager_comment as string | null,
      hrComment: row.hr_comment as string | null,
      reviewPeriod: row.review_period as string | null,
      managerReviewedBy: row.manager_reviewed_by as string | null,
      managerReviewedAt: row.manager_reviewed_at as string | null,
      hrReviewedBy: row.hr_reviewed_by as string | null,
      hrReviewedAt: row.hr_reviewed_at as string | null,
      createdAt: (row.created_at as string) || (row.date as string),
      updatedAt: (row.updated_at as string) || (row.date as string),
    };
  }
}

export default new PerformanceService();
