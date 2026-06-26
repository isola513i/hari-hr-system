import { Router } from "express";
import OrgChartController from "../controllers/OrgChartController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// All org-chart routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/org-chart:
 *   get:
 *     summary: Get full org chart
 *     tags: [Org Chart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *         description: Filter org chart by department name
 *     responses:
 *       200:
 *         description: Full org chart tree returned successfully
 *       401: { description: Unauthorized }
 */
// GET /api/org-chart - Get full org chart (optional ?department=Engineering filter)
router.get(
  "/",
  OrgChartController.getOrgChart.bind(OrgChartController)
);

/**
 * @swagger
 * /api/org-chart/direct-reports/{managerId}:
 *   get:
 *     summary: Get immediate direct reports for a manager
 *     tags: [Org Chart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: managerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID of the manager
 *     responses:
 *       200:
 *         description: List of direct reports returned successfully
 *       401: { description: Unauthorized }
 *       404: { description: Manager not found }
 */
// GET /api/org-chart/direct-reports/:managerId - Get a manager's immediate direct reports
router.get(
  "/direct-reports/:managerId",
  OrgChartController.getDirectReports.bind(OrgChartController)
);

/**
 * @swagger
 * /api/org-chart/subtree/{employeeId}:
 *   get:
 *     summary: Get org chart subtree rooted at a specific employee
 *     tags: [Org Chart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID of the employee at the root of the subtree
 *     responses:
 *       200:
 *         description: Subtree rooted at the specified employee returned successfully
 *       401: { description: Unauthorized }
 *       404: { description: Employee not found }
 */
// GET /api/org-chart/subtree/:employeeId - Get subtree rooted at specific employee
router.get(
  "/subtree/:employeeId",
  OrgChartController.getSubTree.bind(OrgChartController)
);

export default router;
