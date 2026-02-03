import { Request, Response } from "express";
import DashboardService from "../services/DashboardService";

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
      console.error("Error fetching employee stats:", error);
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

      const limit = parseInt(req.query.limit as string) || 5;
      const team = await DashboardService.getMyTeam(employeeId, limit);
      res.json(team);
    } catch (error: any) {
      console.error("Error fetching team:", error);
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
      console.error("Error fetching direct reports:", error);
      res.status(500).json({ error: "Failed to fetch direct reports" });
    }
  }
}

export default new DashboardController();
