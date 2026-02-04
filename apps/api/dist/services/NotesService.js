"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotesService = void 0;
const db_1 = require("../db");
function toResponse(note) {
    return {
        id: note.id,
        content: note.content,
        color: note.color,
        pinned: note.pinned,
        createdAt: note.created_at.toISOString(),
        updatedAt: note.updated_at.toISOString(),
    };
}
class NotesService {
    /**
     * Get all notes for a user (pinned first, then by updated_at)
     */
    getByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)(`SELECT * FROM personal_notes
       WHERE user_id = $1
       ORDER BY pinned DESC, updated_at DESC`, [userId]);
            return result.rows.map(toResponse);
        });
    }
    /**
     * Get a single note by ID (must belong to user)
     */
    getById(noteId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)(`SELECT * FROM personal_notes
       WHERE id = $1 AND user_id = $2`, [noteId, userId]);
            if (result.rows.length === 0) {
                return null;
            }
            return toResponse(result.rows[0]);
        });
    }
    /**
     * Create a new note
     */
    create(userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)(`INSERT INTO personal_notes (user_id, content, color, pinned)
       VALUES ($1, $2, $3, $4)
       RETURNING *`, [userId, data.content, data.color || "default", data.pinned || false]);
            return toResponse(result.rows[0]);
        });
    }
    /**
     * Update a note
     */
    update(noteId, userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Build dynamic update query
            const updates = [];
            const values = [];
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
            const result = yield (0, db_1.query)(`UPDATE personal_notes
       SET ${updates.join(", ")}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING *`, values);
            if (result.rows.length === 0) {
                return null;
            }
            return toResponse(result.rows[0]);
        });
    }
    /**
     * Delete a note
     */
    delete(noteId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield (0, db_1.query)(`DELETE FROM personal_notes
       WHERE id = $1 AND user_id = $2`, [noteId, userId]);
            return ((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0;
        });
    }
    /**
     * Toggle pin status
     */
    togglePin(noteId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)(`UPDATE personal_notes
       SET pinned = NOT pinned, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`, [noteId, userId]);
            if (result.rows.length === 0) {
                return null;
            }
            return toResponse(result.rows[0]);
        });
    }
    /**
     * Get notes count for a user
     */
    getCount(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)(`SELECT COUNT(*) as count FROM personal_notes WHERE user_id = $1`, [userId]);
            return parseInt(result.rows[0].count, 10);
        });
    }
}
exports.NotesService = NotesService;
exports.default = new NotesService();
