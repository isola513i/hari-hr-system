import { Router } from "express";
import DashboardController from "../controllers/DashboardController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// All dashboard routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/dashboard/employee-stats:
 *   get:
 *     summary: Get employee dashboard stats
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Employee dashboard statistics returned successfully
 *       401: { description: Unauthorized }
 */
// GET /api/dashboard/employee-stats - Get employee dashboard stats
router.get(
  "/employee-stats",
  DashboardController.getEmployeeStats.bind(DashboardController)
);

/**
 * @swagger
 * /api/dashboard/my-team:
 *   get:
 *     summary: Get team members for the current user
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Team members returned successfully
 *       401: { description: Unauthorized }
 */
// GET /api/dashboard/my-team - Get team members
router.get(
  "/my-team",
  DashboardController.getMyTeam.bind(DashboardController)
);

/**
 * @swagger
 * /api/dashboard/direct-reports:
 *   get:
 *     summary: Get direct reports for the current manager
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Direct reports returned successfully
 *       401: { description: Unauthorized }
 */
// GET /api/dashboard/direct-reports - Get direct reports (for managers)
router.get(
  "/direct-reports",
  DashboardController.getDirectReports.bind(DashboardController)
);

/**
 * @swagger
 * /api/dashboard/my-team-hierarchy:
 *   get:
 *     summary: Get full team hierarchy including manager, peers, direct reports, and stats
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Team hierarchy returned successfully
 *       401: { description: Unauthorized }
 */
// GET /api/dashboard/my-team-hierarchy - Get full team hierarchy (manager, peers, direct reports, stats)
router.get(
  "/my-team-hierarchy",
  DashboardController.getMyTeamHierarchy.bind(DashboardController)
);

/**
 * @swagger
 * /api/dashboard/admin-stats:
 *   get:
 *     summary: Get aggregated admin dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard statistics returned successfully
 *       401: { description: Unauthorized }
 */
// GET /api/dashboard/admin-stats - Get aggregated admin dashboard stats
router.get(
  "/admin-stats",
  DashboardController.getAdminStats.bind(DashboardController)
);

export default router;
