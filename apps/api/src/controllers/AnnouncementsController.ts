import { Request, Response } from 'express';
import { query } from '../db';
import NotificationService from '../services/NotificationService';

class AnnouncementsController {
  // GET /api/announcements
  async getAllAnnouncements(req: Request, res: Response): Promise<void> {
    try {
      const result = await query(`
        SELECT a.*, e.name AS author_name
        FROM announcements a
        LEFT JOIN users u ON a.created_by = u.id
        LEFT JOIN employees e ON e.user_id = u.id
        ORDER BY a.created_at DESC NULLS LAST, a.id DESC
      `);
      const items = result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        type: row.type,
        date: row.date_str,
        author: row.author_name || null,
        createdAt: row.created_at || null,
      }));
      res.json(items);
    } catch (err) {
      console.error("Error fetching announcements:", err);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  }

  // POST /api/announcements - Create new announcement
  async createAnnouncement(req: Request, res: Response): Promise<void> {
    const { title, description, type, date } = req.body;

    // Validation
    if (!title || !description) {
      res.status(400).json({ error: "Title and description are required" });
      return;
    }

    if (type && !['announcement', 'policy', 'event'].includes(type)) {
      res.status(400).json({ error: "Invalid type. Must be 'announcement', 'policy', or 'event'" });
      return;
    }

    try {
      const userId = (req as any).user?.userId || null;
      const result = await query(
        `INSERT INTO announcements (title, description, type, date_str, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [title, description, type || 'announcement', date || null, userId]
      );

      // Fetch author name
      let authorName = null;
      if (userId) {
        const authorResult = await query(`SELECT e.name FROM employees e JOIN users u ON e.user_id = u.id WHERE u.id = $1`, [userId]);
        authorName = authorResult.rows[0]?.name || null;
      }

      const newAnnouncement = result.rows[0];

      // Notify all employees about the new announcement/event
      const announcementType = type || 'announcement';
      const notifTitle = announcementType === 'event'
        ? `New Event: ${title}`
        : `New Announcement: ${title}`;

      NotificationService.notifyAll({
        title: notifTitle,
        message: description.length > 200 ? description.substring(0, 200) + '...' : description,
        type: 'info',
        link: '/wellbeing',
      }).catch((err) => console.error("Failed to notify employees about announcement:", err));

      res.status(201).json({
        id: newAnnouncement.id,
        title: newAnnouncement.title,
        description: newAnnouncement.description,
        type: newAnnouncement.type,
        date: newAnnouncement.date_str,
        author: authorName,
        createdAt: newAnnouncement.created_at,
      });
    } catch (err) {
      console.error("Error creating announcement:", err);
      res.status(500).json({ error: "Failed to create announcement" });
    }
  }

  // PATCH /api/announcements/:id - Update announcement
  async updateAnnouncement(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { title, description, type, date } = req.body;

    // Validate type if provided
    if (type && !['announcement', 'policy', 'event'].includes(type)) {
      res.status(400).json({ error: "Invalid type. Must be 'announcement', 'policy', or 'event'" });
      return;
    }

    try {
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (title !== undefined) {
        updates.push(`title = $${paramCount++}`);
        values.push(title);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }
      if (type !== undefined) {
        updates.push(`type = $${paramCount++}`);
        values.push(type);
      }
      if (date !== undefined) {
        updates.push(`date_str = $${paramCount++}`);
        values.push(date);
      }

      if (updates.length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }

      values.push(id);
      const result = await query(
        `UPDATE announcements SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Announcement not found" });
        return;
      }

      const updatedAnnouncement = result.rows[0];
      // Fetch author name if created_by exists
      let authorName = null;
      if (updatedAnnouncement.created_by) {
        const authorResult = await query(`SELECT e.name FROM employees e JOIN users u ON e.user_id = u.id WHERE u.id = $1`, [updatedAnnouncement.created_by]);
        authorName = authorResult.rows[0]?.name || null;
      }
      res.json({
        id: updatedAnnouncement.id,
        title: updatedAnnouncement.title,
        description: updatedAnnouncement.description,
        type: updatedAnnouncement.type,
        date: updatedAnnouncement.date_str,
        author: authorName,
        createdAt: updatedAnnouncement.created_at,
      });
    } catch (err) {
      console.error("Error updating announcement:", err);
      res.status(500).json({ error: "Failed to update announcement" });
    }
  }

  // DELETE /api/announcements/:id - Delete announcement
  async deleteAnnouncement(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const result = await query("DELETE FROM announcements WHERE id = $1 RETURNING id", [id]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Announcement not found" });
        return;
      }

      res.json({ message: "Announcement deleted successfully", id: result.rows[0].id });
    } catch (err) {
      console.error("Error deleting announcement:", err);
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  }
}

export default new AnnouncementsController();
