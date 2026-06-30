import { Router, Request, Response } from 'express';
import PerformanceController from '../controllers/PerformanceController';
import PerformanceService from '../services/PerformanceService';
import { generatePerformanceReviewPdf } from '../services/PerformanceReviewPdfService';
import SystemConfigService from '../services/SystemConfigService';
import { query } from '../db';
import { authenticateToken, requireAdmin, requireAdminOrManager } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * /api/performance/review-templates:
 *   get:
 *     summary: List reusable performance-review templates
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of templates with criteria prompts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   name: { type: string }
 *                   criteria:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         key: { type: string }
 *                         prompt: { type: string }
 *       401: { description: Unauthorized }
 */
router.get('/review-templates', PerformanceController.getReviewTemplates.bind(PerformanceController));

// GET /api/performance/reviews/:id/pdf - download review as PDF
// (defined BEFORE /reviews/:id to avoid route shadowing)
/**
 * @swagger
 * /api/performance/reviews/{id}/pdf:
 *   get:
 *     summary: Download a performance review as a PDF
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Performance review ID
 *     responses:
 *       200:
 *         description: PDF file stream of the performance review
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401: { description: Unauthorized }
 *       403: { description: Access denied — not the review owner, manager, or HR admin }
 *       404: { description: Review not found }
 *       500: { description: Failed to generate PDF }
 */
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

/**
 * @swagger
 * /api/performance/reviews:
 *   get:
 *     summary: List performance reviews filtered by the caller's role
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema: { type: string, format: uuid }
 *         description: Filter by employee ID
 *       - in: query
 *         name: reviewPeriod
 *         schema: { type: string }
 *         description: Filter by review period (e.g. "2025-Q1")
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [DRAFT, SUBMITTED, MANAGER_REVIEWED, HR_APPROVED, REJECTED] }
 *         description: Filter by review status
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *         description: Results per page
 *     responses:
 *       200:
 *         description: Paginated list of performance reviews visible to the caller
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401: { description: Unauthorized }
 */
// GET /api/performance/reviews - list (role-filtered)
router.get('/reviews', PerformanceController.getReviews.bind(PerformanceController));

/**
 * @swagger
 * /api/performance/reviews:
 *   post:
 *     summary: Create a performance review for an employee (manager or HR admin only)
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, reviewPeriod]
 *             properties:
 *               employeeId: { type: string, format: uuid }
 *               reviewPeriod: { type: string, description: "e.g. 2025-Q1" }
 *               goals: { type: string }
 *               managerComments: { type: string }
 *               overallRating: { type: number, minimum: 1, maximum: 5 }
 *     responses:
 *       201:
 *         description: Performance review created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — manager or HR admin role required }
 */
// POST /api/performance/reviews - manager/admin creates review for employee
router.post('/reviews', requireAdminOrManager, PerformanceController.createReview.bind(PerformanceController));

/**
 * @swagger
 * /api/performance/reviews/self:
 *   post:
 *     summary: Create a self-review draft (employee submits their own review)
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reviewPeriod]
 *             properties:
 *               reviewPeriod: { type: string, description: "e.g. 2025-Q1" }
 *               selfComments: { type: string }
 *               achievements: { type: string }
 *               goals: { type: string }
 *               selfRating: { type: number, minimum: 1, maximum: 5 }
 *     responses:
 *       201:
 *         description: Self-review draft created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
// POST /api/performance/reviews/self - employee creates own self-review (draft)
router.post('/reviews/self', PerformanceController.createSelfReview.bind(PerformanceController));

/**
 * @swagger
 * /api/performance/reviews/{id}/submit:
 *   post:
 *     summary: Submit a self-review draft for manager evaluation
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Performance review ID
 *     responses:
 *       200:
 *         description: Review submitted successfully
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — only the review owner can submit }
 *       404: { description: Review not found }
 *       409: { description: Review is not in DRAFT status }
 */
// POST /api/performance/reviews/:id/submit - employee submits draft for manager review
router.post('/reviews/:id/submit', PerformanceController.submitSelfReview.bind(PerformanceController));

/**
 * @swagger
 * /api/performance/reviews/{id}/manager-review:
 *   put:
 *     summary: Add manager evaluation to a submitted performance review
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Performance review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [overallRating]
 *             properties:
 *               overallRating: { type: number, minimum: 1, maximum: 5 }
 *               managerComments: { type: string }
 *               strengths: { type: string }
 *               areasForImprovement: { type: string }
 *     responses:
 *       200:
 *         description: Manager review saved
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — manager or HR admin role required }
 *       404: { description: Review not found }
 *       409: { description: Review is not in SUBMITTED status }
 */
// PUT /api/performance/reviews/:id/manager-review - manager evaluates (MANAGER only)
router.put('/reviews/:id/manager-review', requireAdminOrManager, PerformanceController.managerReview.bind(PerformanceController));

/**
 * @swagger
 * /api/performance/reviews/{id}/hr-approve:
 *   put:
 *     summary: HR admin finalizes and approves a manager-reviewed performance review
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Performance review ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hrComments: { type: string }
 *               finalRating: { type: number, minimum: 1, maximum: 5 }
 *     responses:
 *       200:
 *         description: Performance review approved by HR
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — HR admin role required }
 *       404: { description: Review not found }
 *       409: { description: Review is not in MANAGER_REVIEWED status }
 */
// PUT /api/performance/reviews/:id/hr-approve - HR Admin finalizes (HR_ADMIN only)
router.put('/reviews/:id/hr-approve', requireAdmin, PerformanceController.hrApprove.bind(PerformanceController));

/**
 * @swagger
 * /api/performance/reviews/{id}/reject:
 *   put:
 *     summary: Reject a performance review (manager or HR admin)
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Performance review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string, description: Rejection reason returned to the employee }
 *     responses:
 *       200:
 *         description: Review rejected
 *       400: { description: Validation error — reason is required }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — manager or HR admin role required }
 *       404: { description: Review not found }
 */
// PUT /api/performance/reviews/:id/reject - HR or Manager rejects
router.put('/reviews/:id/reject', requireAdminOrManager, PerformanceController.reject.bind(PerformanceController));

/**
 * @swagger
 * /api/performance/reviews/{id}:
 *   put:
 *     summary: Update fields on a performance review
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Performance review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reviewPeriod: { type: string }
 *               goals: { type: string }
 *               selfComments: { type: string }
 *               managerComments: { type: string }
 *               overallRating: { type: number, minimum: 1, maximum: 5 }
 *               selfRating: { type: number, minimum: 1, maximum: 5 }
 *               achievements: { type: string }
 *               areasForImprovement: { type: string }
 *     responses:
 *       200:
 *         description: Review updated
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — insufficient permissions to edit this review }
 *       404: { description: Review not found }
 */
// PUT /api/performance/reviews/:id - edit review
router.put('/reviews/:id', PerformanceController.updateReview.bind(PerformanceController));

/**
 * @swagger
 * /api/performance/reviews/{id}:
 *   delete:
 *     summary: Delete a performance review
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Performance review ID
 *     responses:
 *       204:
 *         description: Review deleted
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — insufficient permissions to delete this review }
 *       404: { description: Review not found }
 */
// DELETE /api/performance/reviews/:id - delete review
router.delete('/reviews/:id', PerformanceController.deleteReview.bind(PerformanceController));

// ── 360-degree peer review ──────────────────────────────────────────────────

/**
 * @swagger
 * /api/performance/reviews/{id}/peer-feedback/request:
 *   post:
 *     summary: Request peer feedback on a review (manager or HR admin)
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Performance review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [peerEmployeeIds]
 *             properties:
 *               peerEmployeeIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *                 description: Employee IDs of the peers to request feedback from
 *     responses:
 *       201:
 *         description: Peer feedback slots created (pending) and peers notified
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — manager or HR admin role required }
 *       404: { description: Review not found }
 */
router.post('/reviews/:id/peer-feedback/request', requireAdminOrManager, PerformanceController.requestPeerReviews.bind(PerformanceController));

/**
 * @swagger
 * /api/performance/reviews/{id}/peer-feedback:
 *   post:
 *     summary: Submit peer feedback on a review (requested peers only)
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Performance review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               feedback: { type: string }
 *               isAnonymous: { type: boolean, default: false }
 *     responses:
 *       201:
 *         description: Peer feedback submitted
 *       400: { description: Validation error — rating out of range or peer not requested }
 *       401: { description: Unauthorized }
 *   get:
 *     summary: Get peer feedback and aggregate 360 score for a review
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Performance review ID
 *     responses:
 *       200:
 *         description: Peer feedback list + aggregate score (manager / peers / overall)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 feedback:
 *                   type: array
 *                   items: { type: object }
 *                 aggregate:
 *                   type: object
 *                   properties:
 *                     managerRating: { type: number, nullable: true }
 *                     peerAverage: { type: number, nullable: true }
 *                     peerCount: { type: integer }
 *                     peerRequested: { type: integer }
 *                     overall: { type: number, nullable: true }
 *       401: { description: Unauthorized }
 *       404: { description: Review not found }
 */
router.post('/reviews/:id/peer-feedback', PerformanceController.submitPeerFeedback.bind(PerformanceController));
router.get('/reviews/:id/peer-feedback', PerformanceController.getPeerFeedback.bind(PerformanceController));

export default router;
