import { Router } from 'express';
import PerformanceController from '../controllers/PerformanceController';
import { authenticateToken, requireAdmin, requireAdminOrManager } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

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
