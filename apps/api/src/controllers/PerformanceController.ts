import { Request, Response } from 'express';
import { query } from '../db';
import NotificationService from '../services/NotificationService';

class PerformanceController {
  // GET /api/performance/reviews
  async getPerformanceReviews(req: Request, res: Response): Promise<void> {
    const { employeeId } = req.query;
    try {
      let queryText = "SELECT * FROM performance_reviews";
      const params: (string | number | boolean | null)[] = [];
      if (employeeId) {
        queryText += " WHERE employee_id = $1";
        params.push(employeeId as string);
      }
      queryText += " ORDER BY date DESC";

      const result = await query(queryText, params);
      const reviews = result.rows.map((row) => ({
        id: row.id,
        employeeId: row.employee_id,
        date: row.date,
        reviewer: row.reviewer,
        reviewerUserId: row.reviewer_user_id,
        rating: row.rating,
        notes: row.notes,
      }));
      res.json(reviews);
    } catch (err) {
      console.error("Error fetching performance reviews:", err);
      res.status(500).json({ error: "Failed to fetch performance reviews" });
    }
  }

  // POST /api/performance/reviews
  async createReview(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { employeeId, date, reviewer, rating, notes } = req.body;
    if (!employeeId || !date || !reviewer || rating === undefined) {
      res.status(400).json({ error: "employeeId, date, reviewer, and rating are required" });
      return;
    }

    try {
      // Prevent self-review
      const selfCheck = await query(
        `SELECT user_id FROM employees WHERE id = $1`,
        [employeeId]
      );
      if (selfCheck.rows[0]?.user_id === userId) {
        res.status(403).json({ error: "You cannot review yourself" });
        return;
      }

      const result = await query(
        `INSERT INTO performance_reviews (employee_id, date, reviewer, reviewer_user_id, rating, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [employeeId, date, reviewer, userId, rating, notes || '']
      );
      const row = result.rows[0];

      // Notify the reviewed employee
      if (selfCheck.rows[0]?.user_id) {
        NotificationService.create({
          user_id: selfCheck.rows[0].user_id,
          title: 'New Performance Review',
          message: `${reviewer} has submitted a performance review for you with a rating of ${rating}/5.`,
          type: 'info',
          link: `/employees/${employeeId}?tab=performance`,
        }).catch((err) => console.error('Failed to notify employee about review:', err));
      }

      res.status(201).json({
        id: row.id,
        employeeId: row.employee_id,
        date: row.date,
        reviewer: row.reviewer,
        reviewerUserId: row.reviewer_user_id,
        rating: row.rating,
        notes: row.notes,
      });
    } catch (err) {
      console.error("Error creating performance review:", err);
      res.status(500).json({ error: "Failed to create performance review" });
    }
  }

  // PUT /api/performance/reviews/:id
  async updateReview(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const { rating, notes, reviewer, date } = req.body;

    try {
      // Only admin or the original reviewer can edit
      if (userRole !== 'HR_ADMIN') {
        const existing = await query(
          `SELECT reviewer_user_id FROM performance_reviews WHERE id = $1`,
          [id]
        );
        if (!existing.rows[0] || existing.rows[0].reviewer_user_id !== userId) {
          res.status(403).json({ error: "You can only edit your own reviews" });
          return;
        }
      }

      const result = await query(
        `UPDATE performance_reviews
         SET rating = COALESCE($1, rating),
             notes = COALESCE($2, notes),
             reviewer = COALESCE($3, reviewer),
             date = COALESCE($4, date)
         WHERE id = $5
         RETURNING *`,
        [rating, notes, reviewer, date, id]
      );
      if (!result.rows[0]) {
        res.status(404).json({ error: "Review not found" });
        return;
      }
      const row = result.rows[0];

      // Notify the reviewed employee about the update
      const empResult = await query(
        `SELECT user_id FROM employees WHERE id = $1`,
        [row.employee_id]
      );
      if (empResult.rows[0]?.user_id) {
        NotificationService.create({
          user_id: empResult.rows[0].user_id,
          title: 'Performance Review Updated',
          message: `Your performance review by ${row.reviewer} has been updated to ${row.rating}/5.`,
          type: 'info',
          link: `/employees/${row.employee_id}?tab=performance`,
        }).catch((err) => console.error('Failed to notify employee about review update:', err));
      }

      res.json({
        id: row.id,
        employeeId: row.employee_id,
        date: row.date,
        reviewer: row.reviewer,
        reviewerUserId: row.reviewer_user_id,
        rating: row.rating,
        notes: row.notes,
      });
    } catch (err) {
      console.error("Error updating performance review:", err);
      res.status(500).json({ error: "Failed to update performance review" });
    }
  }

  // DELETE /api/performance/reviews/:id
  async deleteReview(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params;

    try {
      // Only admin or the original reviewer can delete
      if (userRole !== 'HR_ADMIN') {
        const existing = await query(
          `SELECT reviewer_user_id FROM performance_reviews WHERE id = $1`,
          [id]
        );
        if (!existing.rows[0] || existing.rows[0].reviewer_user_id !== userId) {
          res.status(403).json({ error: "You can only delete your own reviews" });
          return;
        }
      }

      const result = await query(
        `DELETE FROM performance_reviews WHERE id = $1 RETURNING id`,
        [id]
      );
      if (!result.rows[0]) {
        res.status(404).json({ error: "Review not found" });
        return;
      }
      res.json({ message: "Review deleted successfully" });
    } catch (err) {
      console.error("Error deleting performance review:", err);
      res.status(500).json({ error: "Failed to delete performance review" });
    }
  }
}

export default new PerformanceController();
