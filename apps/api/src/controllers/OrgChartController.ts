import { Request, Response } from "express";
import OrgChartService from "../services/OrgChartService";

export class OrgChartController {
  /**
   * GET /api/org-chart
   * Get full org chart with enriched data
   * Optional query param: ?department=Engineering
   */
  async getOrgChart(req: Request, res: Response): Promise<void> {
    try {
      const department = req.query.department as string | undefined;
      const nodes = await OrgChartService.getOrgChart(department);
      res.json(nodes);
    } catch (error: any) {
      console.error("Error fetching org chart:", error);
      res.status(500).json({ error: "Failed to fetch org chart" });
    }
  }

  /**
   * GET /api/org-chart/subtree/:employeeId
   * Get org chart subtree rooted at specific employee
   */
  async getSubTree(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      if (!employeeId) {
        res.status(400).json({ error: "Employee ID is required" });
        return;
      }

      const nodes = await OrgChartService.getSubTree(employeeId);
      if (nodes.length === 0) {
        res.status(404).json({ error: "Employee not found" });
        return;
      }

      res.json(nodes);
    } catch (error: any) {
      console.error("Error fetching org chart subtree:", error);
      res.status(500).json({ error: "Failed to fetch org chart subtree" });
    }
  }
}

export default new OrgChartController();
