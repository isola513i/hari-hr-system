import { Router } from 'express';
import AnalyticsController from '../controllers/AnalyticsController';
import { authenticateToken, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken, requireAdmin);

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get all analytics data in a single call
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregated analytics dashboard data
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden – admin only }
 */
// GET /api/analytics/dashboard - All analytics data in one call
router.get('/dashboard', AnalyticsController.getDashboard.bind(AnalyticsController));

/**
 * @swagger
 * /api/analytics/headcount-stats:
 *   get:
 *     summary: Get standalone headcount statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Headcount breakdown by department, status, or period
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden – admin only }
 */
// GET /api/analytics/headcount-stats - Standalone headcount (used by AdminDashboard)
router.get('/headcount-stats', AnalyticsController.getHeadcountStats.bind(AnalyticsController));

/**
 * @swagger
 * /api/analytics/audit-logs:
 *   get:
 *     summary: Get in-memory audit logs
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *         description: Maximum number of log entries to return
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: List of audit log entries
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden – admin only }
 */
// GET /api/analytics/audit-logs - In-memory audit logs (used by AdminDashboard)
router.get('/audit-logs', AnalyticsController.getAuditLogs.bind(AnalyticsController));

export default router;
