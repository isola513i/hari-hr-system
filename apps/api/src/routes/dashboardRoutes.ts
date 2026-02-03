import { Router } from "express";
import DashboardController from "../controllers/DashboardController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// All dashboard routes require authentication
router.use(authenticateToken);

// GET /api/dashboard/employee-stats - Get employee dashboard stats
router.get(
  "/employee-stats",
  DashboardController.getEmployeeStats.bind(DashboardController)
);

// GET /api/dashboard/my-team - Get team members
router.get(
  "/my-team",
  DashboardController.getMyTeam.bind(DashboardController)
);

// GET /api/dashboard/direct-reports - Get direct reports (for managers)
router.get(
  "/direct-reports",
  DashboardController.getDirectReports.bind(DashboardController)
);

export default router;
