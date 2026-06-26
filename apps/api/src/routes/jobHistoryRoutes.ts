import { Router } from 'express';
import JobHistoryController from '../controllers/JobHistoryController';
import { apiLimiter } from '../middlewares/security';
import { authenticateToken, requireAdmin, requireAdminOrManager } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/job-history:
 *   get:
 *     summary: Get job history entries, optionally filtered by employee
 *     tags: [Job History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema: { type: string, format: uuid }
 *         description: Filter job history by employee ID
 *     responses:
 *       200:
 *         description: List of job history entries
 *       401: { description: Unauthorized }
 */
// GET /api/job-history - Get job history (optionally filtered by employeeId)
router.get('/', JobHistoryController.getJobHistory.bind(JobHistoryController));

/**
 * @swagger
 * /api/job-history:
 *   post:
 *     summary: Create a new job history entry
 *     tags: [Job History]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, position, department, startDate]
 *             properties:
 *               employeeId: { type: string, format: uuid }
 *               position: { type: string }
 *               department: { type: string }
 *               startDate: { type: string, format: date }
 *               endDate: { type: string, format: date }
 *               salary: { type: number }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Job history entry created
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
// POST /api/job-history - Add new job history entry (admin/manager only)
router.post('/', apiLimiter, requireAdminOrManager, JobHistoryController.createJobHistory.bind(JobHistoryController));

/**
 * @swagger
 * /api/job-history/{id}:
 *   put:
 *     summary: Update an existing job history entry
 *     tags: [Job History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               position: { type: string }
 *               department: { type: string }
 *               startDate: { type: string, format: date }
 *               endDate: { type: string, format: date }
 *               salary: { type: number }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Job history entry updated
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
// PUT /api/job-history/:id - Update existing entry (admin/manager only)
router.put('/:id', apiLimiter, requireAdminOrManager, JobHistoryController.updateJobHistory.bind(JobHistoryController));

/**
 * @swagger
 * /api/job-history/{id}:
 *   delete:
 *     summary: Delete a job history entry
 *     tags: [Job History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Job history entry deleted
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
// DELETE /api/job-history/:id - Delete entry (admin only)
router.delete('/:id', apiLimiter, requireAdmin, JobHistoryController.deleteJobHistory.bind(JobHistoryController));

export default router;
