import { Request, Response } from "express";
import NotesService from "../services/NotesService";

export class NotesController {
  /**
   * GET /api/notes - Get all notes for current user
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const notes = await NotesService.getByUserId(userId);
      res.json(notes);
    } catch (error: any) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  }

  /**
   * GET /api/notes/:id - Get a single note
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { id } = req.params;
      const note = await NotesService.getById(id, userId);

      if (!note) {
        res.status(404).json({ error: "Note not found" });
        return;
      }

      res.json(note);
    } catch (error: any) {
      console.error("Error fetching note:", error);
      res.status(500).json({ error: "Failed to fetch note" });
    }
  }

  /**
   * POST /api/notes - Create a new note
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { content, color, pinned } = req.body;

      if (!content || typeof content !== "string" || content.trim() === "") {
        res.status(400).json({ error: "Content is required" });
        return;
      }

      const note = await NotesService.create(userId, {
        content: content.trim(),
        color,
        pinned,
      });

      res.status(201).json(note);
    } catch (error: any) {
      console.error("Error creating note:", error);
      res.status(500).json({ error: "Failed to create note" });
    }
  }

  /**
   * PATCH /api/notes/:id - Update a note
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { id } = req.params;
      const { content, color, pinned } = req.body;

      const note = await NotesService.update(id, userId, {
        content: content?.trim(),
        color,
        pinned,
      });

      if (!note) {
        res.status(404).json({ error: "Note not found" });
        return;
      }

      res.json(note);
    } catch (error: any) {
      console.error("Error updating note:", error);
      res.status(500).json({ error: "Failed to update note" });
    }
  }

  /**
   * DELETE /api/notes/:id - Delete a note
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { id } = req.params;
      const deleted = await NotesService.delete(id, userId);

      if (!deleted) {
        res.status(404).json({ error: "Note not found" });
        return;
      }

      res.json({ message: "Note deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting note:", error);
      res.status(500).json({ error: "Failed to delete note" });
    }
  }

  /**
   * POST /api/notes/:id/toggle-pin - Toggle pin status
   */
  async togglePin(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { id } = req.params;
      const note = await NotesService.togglePin(id, userId);

      if (!note) {
        res.status(404).json({ error: "Note not found" });
        return;
      }

      res.json(note);
    } catch (error: any) {
      console.error("Error toggling pin:", error);
      res.status(500).json({ error: "Failed to toggle pin" });
    }
  }
}

export default new NotesController();
