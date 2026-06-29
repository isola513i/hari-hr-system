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

// ── Predictive analytics ────────────────────────────────────────────────────

/**
 * @swagger
 * /api/analytics/headcount-forecast:
 *   get:
 *     summary: Active headcount over 12 months with a 3-month projection
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historical headcount + linear forecast with confidence band
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 history:
 *                   type: array
 *                   items: { type: object, properties: { month: { type: string }, name: { type: string }, value: { type: number } } }
 *                 forecast:
 *                   type: array
 *                   items: { type: object, properties: { month: { type: string }, name: { type: string }, value: { type: number }, lower: { type: number }, upper: { type: number } } }
 *                 momentum: { type: number, description: "% change of last 3 months vs prior 3" }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden – admin only }
 */
router.get('/headcount-forecast', AnalyticsController.getHeadcountForecast.bind(AnalyticsController));

/**
 * @swagger
 * /api/analytics/leave-forecast:
 *   get:
 *     summary: Approved leave-days over 12 months with a 3-month demand projection
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historical leave demand + linear forecast with confidence band
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden – admin only }
 */
router.get('/leave-forecast', AnalyticsController.getLeaveForecast.bind(AnalyticsController));

/**
 * @swagger
 * /api/analytics/attrition-risk:
 *   get:
 *     summary: Per-department turnover (last 6 months) with a risk flag
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Department turnover rates with low/medium/high risk classification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 departments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       department: { type: string }
 *                       active: { type: integer }
 *                       departures: { type: integer }
 *                       turnoverRate: { type: number }
 *                       risk: { type: string, enum: [low, medium, high] }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden – admin only }
 */
router.get('/attrition-risk', AnalyticsController.getAttritionRisk.bind(AnalyticsController));

export default router;
