import { Request, Response } from "express";
import DashboardService from "../services/DashboardService";
import logger from '../utils/logger';

export class DashboardController {
  /**
   * GET /api/dashboard/employee-stats
   * Get dashboard stats for the current employee
   */
  async getEmployeeStats(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.employeeId;
      if (!employeeId) {
        res.status(400).json({ error: "Employee ID not found" });
        return;
      }

      const stats = await DashboardService.getEmployeeStats(employeeId);
      res.json(stats);
    } catch (error: any) {
      logger.error(error, "Error fetching employee stats:");
      res.status(500).json({ error: "Failed to fetch employee stats" });
    }
  }

  /**
   * GET /api/dashboard/my-team
   * Get team members (colleagues in same department)
   */
  async getMyTeam(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.employeeId;
      if (!employeeId) {
        res.status(400).json({ error: "Employee ID not found" });
        return;
      }

      const limit = parseInt(req.query.limit as string, 10) || 5;
      const team = await DashboardService.getMyTeam(employeeId, limit);
      res.json(team);
    } catch (error: any) {
      logger.error(error, "Error fetching team:");
      res.status(500).json({ error: "Failed to fetch team" });
    }
  }

  /**
   * GET /api/dashboard/direct-reports
   * Get direct reports for a manager
   */
  async getDirectReports(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.employeeId;
      if (!employeeId) {
        res.status(400).json({ error: "Employee ID not found" });
        return;
      }

      const directReports = await DashboardService.getDirectReports(employeeId);
      res.json(directReports);
    } catch (error: any) {
      logger.error(error, "Error fetching direct reports:");
      res.status(500).json({ error: "Failed to fetch direct reports" });
    }
  }
  /**
   * GET /api/dashboard/my-team-hierarchy
   * Get full team hierarchy (manager, peers, direct reports, stats)
   */
  async getMyTeamHierarchy(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.employeeId;
      if (!employeeId) {
        res.status(400).json({ error: "Employee ID not found" });
        return;
      }

      const hierarchy = await DashboardService.getMyTeamHierarchy(employeeId);
      res.json(hierarchy);
    } catch (error: any) {
      logger.error(error, "Error fetching team hierarchy:");
      res.status(500).json({ error: "Failed to fetch team hierarchy" });
    }
  }

  /**
   * GET /api/dashboard/admin-stats
   * Get aggregated stats for admin dashboard
   * Returns: newHiresCount, newHiresTrend, turnoverRate, turnoverTrend
   */
  async getAdminStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await DashboardService.getAdminStats();
      res.json(stats);
    } catch (error: any) {
      logger.error(error, "Error fetching admin stats:");
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  }
}

export default new DashboardController();
