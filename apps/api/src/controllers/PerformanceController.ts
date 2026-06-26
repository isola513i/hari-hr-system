import { Request, Response } from 'express';
import PerformanceService from '../services/PerformanceService';
import type { AuditContext } from '../services/PerformanceService';
import { safeErrorMessage } from '../utils/errorResponse';
import logger from '../utils/logger';

function buildAudit(req: Request): AuditContext {
  const user = req.user!;
  return {
    userId:    user.userId,
    email:     user.email,
    ip:        req.ip ?? '',
    userAgent: req.headers['user-agent'] ?? '',
    method:    req.method,
    path:      req.path,
  };
}

class PerformanceController {
  async getReviews(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { employeeId, status, reviewPeriod } = req.query;
    try {
      const reviews = await PerformanceService.list({
        employeeId: employeeId as string | undefined,
        status: status as string | undefined,
        reviewPeriod: reviewPeriod as string | undefined,
        role: user.role,
        callerEmployeeId: user.employeeId ?? undefined,
      });
      res.json(reviews);
    } catch (err) {
      logger.error(err, 'Error fetching performance reviews:');
      res.status(500).json({ error: 'Failed to fetch performance reviews' });
    }
  }

  async createReview(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { employeeId, date, reviewer, rating, notes, reviewPeriod, selfReview } = req.body;
    if (!employeeId || !date || !reviewer) {
      res.status(400).json({ error: 'employeeId, date, and reviewer are required' });
      return;
    }
    try {
      const review = await PerformanceService.create({
        employeeId, date, reviewer,
        reviewerUserId: user.userId,
        rating: rating !== undefined ? Number(rating) : undefined,
        notes, reviewPeriod, selfReview,
      }, buildAudit(req));
      res.status(201).json(review);
    } catch (err: any) {
      logger.error(err, 'Error creating performance review:');
      const status = err.name === 'BusinessError' ? 400 : 500;
      res.status(status).json({ error: safeErrorMessage(err, 'Failed to create performance review') });
    }
  }

  async createSelfReview(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { selfReview, reviewPeriod } = req.body;
    if (!selfReview) {
      res.status(400).json({ error: 'selfReview text is required' });
      return;
    }
    if (!user.employeeId) {
      res.status(400).json({ error: 'No employee profile linked to your account' });
      return;
    }
    try {
      const review = await PerformanceService.createSelfReview({
        employeeId: user.employeeId,
        selfReview, reviewPeriod,
        callerUserId: user.userId,
        audit: buildAudit(req),
      });
      res.status(201).json(review);
    } catch (err: any) {
      logger.error(err, 'Error creating self-review:');
      const status = err.name === 'BusinessError' ? 400 : 500;
      res.status(status).json({ error: safeErrorMessage(err, 'Failed to create self-review') });
    }
  }

  async submitSelfReview(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { id } = req.params;
    try {
      const review = await PerformanceService.submitSelfReview(id, user.userId, buildAudit(req));
      res.json(review);
    } catch (err: any) {
      logger.error(err, 'Error submitting self-review:');
      const status = err.name === 'BusinessError' ? 400 : 500;
      res.status(status).json({ error: safeErrorMessage(err, 'Failed to submit self-review') });
    }
  }

  async managerReview(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { id } = req.params;
    const { rating, managerComment } = req.body;
    if (!rating || !managerComment) {
      res.status(400).json({ error: 'rating and managerComment are required' });
      return;
    }
    if (!user.employeeId) {
      res.status(400).json({ error: 'No employee profile linked to your account' });
      return;
    }
    try {
      const review = await PerformanceService.managerReview({
        id,
        rating: Number(rating),
        managerComment,
        managerUserId: user.userId,
        managerEmployeeId: user.employeeId,
        audit: buildAudit(req),
      });
      res.json(review);
    } catch (err: any) {
      logger.error(err, 'Error submitting manager review:');
      const status = err.name === 'BusinessError' ? 400 : 500;
      res.status(status).json({ error: safeErrorMessage(err, 'Failed to submit manager review') });
    }
  }

  async hrApprove(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { id } = req.params;
    const { hrComment } = req.body;
    try {
      const review = await PerformanceService.hrApprove({
        id, hrComment, hrUserId: user.userId, audit: buildAudit(req),
      });
      res.json(review);
    } catch (err: any) {
      logger.error(err, 'Error finalizing review:');
      const status = err.name === 'BusinessError' ? 400 : 500;
      res.status(status).json({ error: safeErrorMessage(err, 'Failed to finalize review') });
    }
  }

  async reject(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { id } = req.params;
    const { reason } = req.body;
    try {
      const review = await PerformanceService.reject({
        id, reason, callerUserId: user.userId, role: user.role, audit: buildAudit(req),
      });
      res.json(review);
    } catch (err: any) {
      logger.error(err, 'Error rejecting review:');
      const status = err.name === 'BusinessError' ? 400 : 500;
      res.status(status).json({ error: safeErrorMessage(err, 'Failed to reject review') });
    }
  }

  async updateReview(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { id } = req.params;
    const { rating, notes, reviewer, date } = req.body;
    try {
      const review = await PerformanceService.update(id, { rating, notes, reviewer, date }, user.userId, user.role, buildAudit(req));
      res.json(review);
    } catch (err: any) {
      logger.error(err, 'Error updating performance review:');
      const status = err.name === 'BusinessError' ? 400 : 500;
      res.status(status).json({ error: safeErrorMessage(err, 'Failed to update review') });
    }
  }

  async deleteReview(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { id } = req.params;
    try {
      await PerformanceService.delete(id, user.userId, user.role, buildAudit(req));
      res.json({ message: 'Review deleted successfully' });
    } catch (err: any) {
      logger.error(err, 'Error deleting performance review:');
      const status = err.name === 'BusinessError' ? 400 : 500;
      res.status(status).json({ error: safeErrorMessage(err, 'Failed to delete review') });
    }
  }
}

export default new PerformanceController();
