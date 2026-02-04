import { Router } from "express";
import OrgChartController from "../controllers/OrgChartController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// All org-chart routes require authentication
router.use(authenticateToken);

// GET /api/org-chart - Get full org chart (optional ?department=Engineering filter)
router.get(
  "/",
  OrgChartController.getOrgChart.bind(OrgChartController)
);

// GET /api/org-chart/subtree/:employeeId - Get subtree rooted at specific employee
router.get(
  "/subtree/:employeeId",
  OrgChartController.getSubTree.bind(OrgChartController)
);

export default router;
