import { Request, Response } from 'express';
import { query } from '../db';

class EventsController {
  // GET /api/events
  async getAllEvents(req: Request, res: Response): Promise<void> {
    try {
      const result = await query("SELECT id, title, date_str, type, avatar, color FROM events");
      const events = result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        date: row.date_str,
        type: row.type,
        avatar: row.avatar,
        color: row.color,
      }));
      res.json(events);
    } catch (err) {
      console.error("Error fetching events:", err);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  }

  // GET /api/events/upcoming
  async getUpcomingEvents(req: Request, res: Response): Promise<void> {
    try {
      const result = await query("SELECT id, title, date, type, avatar, color FROM upcoming_events ORDER BY date ASC");
      const events = result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        date: row.date,
        type: row.type,
        avatar: row.avatar,
        color: row.color,
      }));
      res.json(events);
    } catch (err) {
      console.error("Error fetching upcoming events:", err);
      res.status(500).json({ error: "Failed to fetch upcoming events" });
    }
  }

  // POST /api/events/upcoming - Create new upcoming event
  async createUpcomingEvent(req: Request, res: Response): Promise<void> {
    const { title, date, type } = req.body;

    // Validation
    if (!title || !date) {
      res.status(400).json({ error: "Title and date are required" });
      return;
    }

    const validTypes = ['Birthday', 'Meeting', 'Social', 'Training', 'Holiday', 'Deadline', 'Company Event'];
    if (type && !validTypes.includes(type)) {
      res.status(400).json({ error: "Invalid event type" });
      return;
    }

    try {
      const userId = (req as any).user?.userId || null;
      const result = await query(
        `INSERT INTO upcoming_events (title, date, type, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [title, date, type || 'Meeting', userId]
      );

      const newEvent = result.rows[0];
      res.status(201).json({
        id: newEvent.id,
        title: newEvent.title,
        date: newEvent.date,
        type: newEvent.type,
        avatar: newEvent.avatar,
        color: newEvent.color,
      });
    } catch (err) {
      console.error("Error creating upcoming event:", err);
      res.status(500).json({ error: "Failed to create upcoming event" });
    }
  }

  // DELETE /api/events/upcoming/:id - Delete an upcoming event
  async deleteUpcomingEvent(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const result = await query("DELETE FROM upcoming_events WHERE id = $1", [id]);
      if (result.rowCount === 0) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      res.json({ message: "Event deleted successfully" });
    } catch (err) {
      console.error("Error deleting upcoming event:", err);
      res.status(500).json({ error: "Failed to delete upcoming event" });
    }
  }
}

export default new EventsController();
