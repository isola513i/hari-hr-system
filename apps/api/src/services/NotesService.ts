import { query } from "../db";
import {
  Note,
  CreateNoteRequest,
  UpdateNoteRequest,
  NoteResponse,
} from "../models/Note";

function toResponse(note: Note): NoteResponse {
  return {
    id: note.id,
    content: note.content,
    color: note.color,
    pinned: note.pinned,
    createdAt: note.created_at.toISOString(),
    updatedAt: note.updated_at.toISOString(),
  };
}

export class NotesService {
  /**
   * Get all notes for a user (pinned first, then by updated_at)
   */
  async getByUserId(userId: string): Promise<NoteResponse[]> {
    const result = await query(
      `SELECT * FROM personal_notes
       WHERE user_id = $1
       ORDER BY pinned DESC, updated_at DESC`,
      [userId]
    );
    return result.rows.map(toResponse);
  }

  /**
   * Get a single note by ID (must belong to user)
   */
  async getById(noteId: string, userId: string): Promise<NoteResponse | null> {
    const result = await query(
      `SELECT * FROM personal_notes
       WHERE id = $1 AND user_id = $2`,
      [noteId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return toResponse(result.rows[0]);
  }

  /**
   * Create a new note
   */
  async create(userId: string, data: CreateNoteRequest): Promise<NoteResponse> {
    const result = await query(
      `INSERT INTO personal_notes (user_id, content, color, pinned)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, data.content, data.color || "default", data.pinned || false]
    );
    return toResponse(result.rows[0]);
  }

  /**
   * Update a note
   */
  async update(
    noteId: string,
    userId: string,
    data: UpdateNoteRequest
  ): Promise<NoteResponse | null> {
    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(data.content);
    }

    if (data.color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(data.color);
    }

    if (data.pinned !== undefined) {
      updates.push(`pinned = $${paramIndex++}`);
      values.push(data.pinned);
    }

    if (updates.length === 0) {
      return this.getById(noteId, userId);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(noteId, userId);

    const result = await query(
      `UPDATE personal_notes
       SET ${updates.join(", ")}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return toResponse(result.rows[0]);
  }

  /**
   * Delete a note
   */
  async delete(noteId: string, userId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM personal_notes
       WHERE id = $1 AND user_id = $2`,
      [noteId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Toggle pin status
   */
  async togglePin(noteId: string, userId: string): Promise<NoteResponse | null> {
    const result = await query(
      `UPDATE personal_notes
       SET pinned = NOT pinned, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [noteId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return toResponse(result.rows[0]);
  }

  /**
   * Get notes count for a user
   */
  async getCount(userId: string): Promise<number> {
    const result = await query(
      `SELECT COUNT(*) as count FROM personal_notes WHERE user_id = $1`,
      [userId]
    );
    return parseInt(result.rows[0].count, 10);
  }
}

export default new NotesService();
