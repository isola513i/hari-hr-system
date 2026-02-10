import { Request, Response } from 'express';
import { query } from '../../db';

class JobHistoryController {
  // GET /api/job-history
  async getJobHistory(req: Request, res: Response): Promise<void> {
    const { employeeId } = req.query;
    try {
      let queryText = "SELECT * FROM job_history";
      const params: (string | number | boolean | null)[] = [];
      if (employeeId) {
        queryText += " WHERE employee_id = $1";
        params.push(employeeId as string);
      }
      queryText += " ORDER BY start_date DESC";

      const result = await query(queryText, params);
      const history = result.rows.map((row) => ({
        id: row.id,
        role: row.role,
        department: row.department,
        startDate: row.start_date,
        endDate: row.end_date || "Present",
        description: row.description,
      }));
      res.json(history);
    } catch (err) {
      console.error("Error fetching job history:", err);
      res.status(500).json({ error: "Failed to fetch job history" });
    }
  }

  // POST /api/job-history - Add new job history entry
  async createJobHistory(req: Request, res: Response): Promise<void> {
    const { employeeId, role, department, startDate, endDate, description } = req.body;

    if (!employeeId || !role || !department || !startDate) {
      res.status(400).json({ error: "Employee ID, role, department, and start date are required" });
      return;
    }

    try {
      const result = await query(
        `INSERT INTO job_history (employee_id, role, department, start_date, end_date, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [employeeId, role, department, startDate, endDate && endDate !== "Present" ? endDate : null, description || null]
      );

      const newHistory = result.rows[0];
      res.status(201).json({
        id: newHistory.id,
        role: newHistory.role,
        department: newHistory.department,
        startDate: newHistory.start_date,
        endDate: newHistory.end_date || "Present",
        description: newHistory.description,
      });
    } catch (err) {
      console.error("Error creating job history:", err);
      res.status(500).json({ error: "Failed to create job history" });
    }
  }
}

export default new JobHistoryController();
