import { Router, Request, Response } from 'express';
import TrainingController from '../controllers/TrainingController';
import { apiLimiter } from '../middlewares/security';
import { authenticateToken, requireAdmin, requireAdminOrManager } from '../middlewares/auth';
import { cacheMiddleware, invalidateCache } from '../middlewares/cache';
import { generateCertificatePdf } from '../services/CertificatePdfService';
import SystemConfigService from '../services/SystemConfigService';
import { query } from '../db';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Module CRUD
/**
 * @swagger
 * /api/training/modules:
 *   get:
 *     summary: List all training modules
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Filter modules by category
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search modules by title or description
 *     responses:
 *       200:
 *         description: List of training modules
 *       401: { description: Unauthorized }
 */
router.get('/modules', cacheMiddleware(), TrainingController.getAllModules.bind(TrainingController));
/**
 * @swagger
 * /api/training/modules/{id}:
 *   get:
 *     summary: Get a training module by ID
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Training module details
 *       401: { description: Unauthorized }
 *       404: { description: Module not found }
 */
router.get('/modules/:id', cacheMiddleware(), TrainingController.getModuleById.bind(TrainingController));
/**
 * @swagger
 * /api/training/modules:
 *   post:
 *     summary: Create a new training module
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               category: { type: string }
 *               duration_hours: { type: number }
 *               passing_score: { type: number }
 *               is_mandatory: { type: boolean }
 *     responses:
 *       201:
 *         description: Training module created
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Admin access required }
 */
router.post('/modules', requireAdmin, apiLimiter, invalidateCache('/api/training'), TrainingController.createModule.bind(TrainingController));
/**
 * @swagger
 * /api/training/modules/{id}:
 *   put:
 *     summary: Update a training module
 *     tags: [Training]
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
 *               title: { type: string }
 *               description: { type: string }
 *               category: { type: string }
 *               duration_hours: { type: number }
 *               passing_score: { type: number }
 *               is_mandatory: { type: boolean }
 *     responses:
 *       200:
 *         description: Training module updated
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Admin access required }
 *       404: { description: Module not found }
 */
router.put('/modules/:id', requireAdmin, apiLimiter, invalidateCache('/api/training'), TrainingController.updateModule.bind(TrainingController));
/**
 * @swagger
 * /api/training/modules/{id}:
 *   delete:
 *     summary: Delete a training module
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Training module deleted
 *       401: { description: Unauthorized }
 *       403: { description: Admin access required }
 *       404: { description: Module not found }
 */
router.delete('/modules/:id', requireAdmin, apiLimiter, invalidateCache('/api/training'), TrainingController.deleteModule.bind(TrainingController));

// Employee training
/**
 * @swagger
 * /api/training/employee/{employeeId}:
 *   get:
 *     summary: Get all training records for an employee
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Assigned, In Progress, Completed, Failed] }
 *         description: Filter by training status
 *     responses:
 *       200:
 *         description: List of employee training records
 *       401: { description: Unauthorized }
 *       404: { description: Employee not found }
 */
router.get('/employee/:employeeId', TrainingController.getEmployeeTraining.bind(TrainingController));
/**
 * @swagger
 * /api/training/assign:
 *   post:
 *     summary: Assign a training module to an employee
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employee_id, module_id]
 *             properties:
 *               employee_id: { type: string, format: uuid }
 *               module_id: { type: string, format: uuid }
 *               due_date: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Training assigned successfully
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Manager or Admin access required }
 *       404: { description: Employee or module not found }
 */
router.post('/assign', requireAdminOrManager, apiLimiter, invalidateCache('/api/training'), TrainingController.assignTraining.bind(TrainingController));
/**
 * @swagger
 * /api/training/bulk-assign:
 *   post:
 *     summary: Bulk assign a training module to multiple employees
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employee_ids, module_id]
 *             properties:
 *               employee_ids:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *               module_id: { type: string, format: uuid }
 *               due_date: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Training bulk-assigned successfully
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Manager or Admin access required }
 */
router.post('/bulk-assign', requireAdminOrManager, apiLimiter, invalidateCache('/api/training'), TrainingController.bulkAssignTraining.bind(TrainingController));
/**
 * @swagger
 * /api/training/{id}:
 *   patch:
 *     summary: Update training completion status or progress
 *     tags: [Training]
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
 *               status: { type: string, enum: [Assigned, In Progress, Completed, Failed] }
 *               score: { type: number }
 *               completion_date: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Training record updated
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: Training record not found }
 */
router.patch('/:id', apiLimiter, invalidateCache('/api/training'), TrainingController.updateTraining.bind(TrainingController));
/**
 * @swagger
 * /api/training/{id}:
 *   delete:
 *     summary: Delete an employee training record
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Training record deleted
 *       401: { description: Unauthorized }
 *       403: { description: Manager or Admin access required }
 *       404: { description: Training record not found }
 */
router.delete('/:id', requireAdminOrManager, apiLimiter, invalidateCache('/api/training'), TrainingController.deleteTraining.bind(TrainingController));

// Analytics
/**
 * @swagger
 * /api/training/analytics:
 *   get:
 *     summary: Get training analytics and completion statistics
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: department_id
 *         schema: { type: string, format: uuid }
 *         description: Filter analytics by department
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *         description: Start date for analytics range
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *         description: End date for analytics range
 *     responses:
 *       200:
 *         description: Training analytics summary
 *       401: { description: Unauthorized }
 *       403: { description: Manager or Admin access required }
 */
router.get('/analytics', requireAdminOrManager, cacheMiddleware(60000), TrainingController.getAnalytics.bind(TrainingController));

/**
 * @swagger
 * /api/training/{id}/certificate:
 *   get:
 *     summary: Download completion certificate PDF for a completed training record
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Certificate PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400: { description: Training not yet completed }
 *       401: { description: Unauthorized }
 *       403: { description: Access denied }
 *       404: { description: Training record not found }
 */
router.get('/:id/certificate', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = await query(
      `SELECT et.*, e.name AS employee_name, e.user_id
       FROM employee_training et
       JOIN employees e ON e.id = et.employee_id
       WHERE et.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Training record not found' });

    const rec = result.rows[0];
    if (rec.status !== 'Completed') return res.status(400).json({ error: 'Training not yet completed' });

    // Only the employee themselves, their manager, or admin can download
    if (user.role !== 'HR_ADMIN' && user.role !== 'MANAGER' && user.id !== rec.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const companyName = await SystemConfigService.getConfigValue('system', 'app_name', 'HARI HR System');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${rec.id}.pdf"`);

    generateCertificatePdf({
      employeeName: rec.employee_name,
      trainingTitle: rec.title,
      completionDate: rec.completion_date,
      score: rec.score,
      companyName: String(companyName),
      certificateId: `CERT-${rec.id.slice(0, 8).toUpperCase()}`,
    }, res);
  } catch (err) {
    console.error('Certificate PDF error:', err);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
});

export default router;
