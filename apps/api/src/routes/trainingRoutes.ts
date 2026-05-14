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
router.get('/modules', cacheMiddleware(), TrainingController.getAllModules.bind(TrainingController));
router.get('/modules/:id', cacheMiddleware(), TrainingController.getModuleById.bind(TrainingController));
router.post('/modules', requireAdmin, apiLimiter, invalidateCache('/api/training'), TrainingController.createModule.bind(TrainingController));
router.put('/modules/:id', requireAdmin, apiLimiter, invalidateCache('/api/training'), TrainingController.updateModule.bind(TrainingController));
router.delete('/modules/:id', requireAdmin, apiLimiter, invalidateCache('/api/training'), TrainingController.deleteModule.bind(TrainingController));

// Employee training
router.get('/employee/:employeeId', TrainingController.getEmployeeTraining.bind(TrainingController));
router.post('/assign', requireAdminOrManager, apiLimiter, invalidateCache('/api/training'), TrainingController.assignTraining.bind(TrainingController));
router.post('/bulk-assign', requireAdminOrManager, apiLimiter, invalidateCache('/api/training'), TrainingController.bulkAssignTraining.bind(TrainingController));
router.patch('/:id', apiLimiter, invalidateCache('/api/training'), TrainingController.updateTraining.bind(TrainingController));
router.delete('/:id', requireAdminOrManager, apiLimiter, invalidateCache('/api/training'), TrainingController.deleteTraining.bind(TrainingController));

// Analytics
router.get('/analytics', requireAdminOrManager, cacheMiddleware(60000), TrainingController.getAnalytics.bind(TrainingController));

/**
 * GET /api/training/:id/certificate
 * Download completion certificate PDF for a completed training record
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
