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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotesController = void 0;
const NotesService_1 = __importDefault(require("../services/NotesService"));
class NotesController {
    /**
     * GET /api/notes - Get all notes for current user
     */
    getAll(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    res.status(401).json({ error: "Unauthorized" });
                    return;
                }
                const notes = yield NotesService_1.default.getByUserId(userId);
                res.json(notes);
            }
            catch (error) {
                console.error("Error fetching notes:", error);
                res.status(500).json({ error: "Failed to fetch notes" });
            }
        });
    }
    /**
     * GET /api/notes/:id - Get a single note
     */
    getById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    res.status(401).json({ error: "Unauthorized" });
                    return;
                }
                const { id } = req.params;
                const note = yield NotesService_1.default.getById(id, userId);
                if (!note) {
                    res.status(404).json({ error: "Note not found" });
                    return;
                }
                res.json(note);
            }
            catch (error) {
                console.error("Error fetching note:", error);
                res.status(500).json({ error: "Failed to fetch note" });
            }
        });
    }
    /**
     * POST /api/notes - Create a new note
     */
    create(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    res.status(401).json({ error: "Unauthorized" });
                    return;
                }
                const { content, color, pinned } = req.body;
                if (!content || typeof content !== "string" || content.trim() === "") {
                    res.status(400).json({ error: "Content is required" });
                    return;
                }
                const note = yield NotesService_1.default.create(userId, {
                    content: content.trim(),
                    color,
                    pinned,
                });
                res.status(201).json(note);
            }
            catch (error) {
                console.error("Error creating note:", error);
                res.status(500).json({ error: "Failed to create note" });
            }
        });
    }
    /**
     * PATCH /api/notes/:id - Update a note
     */
    update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    res.status(401).json({ error: "Unauthorized" });
                    return;
                }
                const { id } = req.params;
                const { content, color, pinned } = req.body;
                const note = yield NotesService_1.default.update(id, userId, {
                    content: content === null || content === void 0 ? void 0 : content.trim(),
                    color,
                    pinned,
                });
                if (!note) {
                    res.status(404).json({ error: "Note not found" });
                    return;
                }
                res.json(note);
            }
            catch (error) {
                console.error("Error updating note:", error);
                res.status(500).json({ error: "Failed to update note" });
            }
        });
    }
    /**
     * DELETE /api/notes/:id - Delete a note
     */
    delete(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    res.status(401).json({ error: "Unauthorized" });
                    return;
                }
                const { id } = req.params;
                const deleted = yield NotesService_1.default.delete(id, userId);
                if (!deleted) {
                    res.status(404).json({ error: "Note not found" });
                    return;
                }
                res.json({ message: "Note deleted successfully" });
            }
            catch (error) {
                console.error("Error deleting note:", error);
                res.status(500).json({ error: "Failed to delete note" });
            }
        });
    }
    /**
     * POST /api/notes/:id/toggle-pin - Toggle pin status
     */
    togglePin(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    res.status(401).json({ error: "Unauthorized" });
                    return;
                }
                const { id } = req.params;
                const note = yield NotesService_1.default.togglePin(id, userId);
                if (!note) {
                    res.status(404).json({ error: "Note not found" });
                    return;
                }
                res.json(note);
            }
            catch (error) {
                console.error("Error toggling pin:", error);
                res.status(500).json({ error: "Failed to toggle pin" });
            }
        });
    }
}
exports.NotesController = NotesController;
exports.default = new NotesController();
