import { Router, Request, Response } from 'express';
import PerformanceController from '../controllers/PerformanceController';
import PerformanceService from '../services/PerformanceService';
import { generatePerformanceReviewPdf } from '../services/PerformanceReviewPdfService';
import SystemConfigService from '../services/SystemConfigService';
import { query } from '../db';
import { authenticateToken, requireAdmin, requireAdminOrManager } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

// GET /api/performance/reviews/:id/pdf - download review as PDF
// (defined BEFORE /reviews/:id to avoid route shadowing)
router.get('/reviews/:id/pdf', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const review = await PerformanceService.get(id);

    // Access control: owner, manager, or HR admin
    const isOwner = user?.employeeId === review.employeeId;
    const isPrivileged = user?.role === 'HR_ADMIN' || user?.role === 'MANAGER';
    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const empResult = await query(
      'SELECT department FROM employees WHERE id = $1',
      [review.employeeId]
    );
    const department = empResult.rows[0]?.department;

    const companyName = await SystemConfigService.getConfigValue('system', 'app_name', 'HARI HR System');

    const periodSlug = (review.reviewPeriod || review.date).replace(/[^A-Za-z0-9-]+/g, '-');
    const employeeSlug = (review.employeeName || review.employeeId).replace(/[^A-Za-z0-9-]+/g, '-');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="performance-review-${employeeSlug}-${periodSlug}.pdf"`);

    generatePerformanceReviewPdf(review, res, {
      companyName: String(companyName),
      employeeDepartment: department,
    });
  } catch (error) {
    console.error('Performance review PDF error:', error);
    res.status(500).json({ error: 'Failed to generate performance review PDF' });
  }
});

// GET /api/performance/reviews - list (role-filtered)
router.get('/reviews', PerformanceController.getReviews.bind(PerformanceController));

// POST /api/performance/reviews - manager/admin creates review for employee
router.post('/reviews', requireAdminOrManager, PerformanceController.createReview.bind(PerformanceController));

// POST /api/performance/reviews/self - employee creates own self-review (draft)
router.post('/reviews/self', PerformanceController.createSelfReview.bind(PerformanceController));

// POST /api/performance/reviews/:id/submit - employee submits draft for manager review
router.post('/reviews/:id/submit', PerformanceController.submitSelfReview.bind(PerformanceController));

// PUT /api/performance/reviews/:id/manager-review - manager evaluates (MANAGER only)
router.put('/reviews/:id/manager-review', requireAdminOrManager, PerformanceController.managerReview.bind(PerformanceController));

// PUT /api/performance/reviews/:id/hr-approve - HR Admin finalizes (HR_ADMIN only)
router.put('/reviews/:id/hr-approve', requireAdmin, PerformanceController.hrApprove.bind(PerformanceController));

// PUT /api/performance/reviews/:id/reject - HR or Manager rejects
router.put('/reviews/:id/reject', requireAdminOrManager, PerformanceController.reject.bind(PerformanceController));

// PUT /api/performance/reviews/:id - edit review
router.put('/reviews/:id', PerformanceController.updateReview.bind(PerformanceController));

// DELETE /api/performance/reviews/:id - delete review
router.delete('/reviews/:id', PerformanceController.deleteReview.bind(PerformanceController));

export default router;
