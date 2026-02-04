"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const NotesController_1 = __importDefault(require("../controllers/NotesController"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// All notes routes require authentication
router.use(auth_1.authenticateToken);
// GET /api/notes - Get all notes
router.get("/", NotesController_1.default.getAll.bind(NotesController_1.default));
// GET /api/notes/:id - Get single note
router.get("/:id", NotesController_1.default.getById.bind(NotesController_1.default));
// POST /api/notes - Create note
router.post("/", NotesController_1.default.create.bind(NotesController_1.default));
// PATCH /api/notes/:id - Update note
router.patch("/:id", NotesController_1.default.update.bind(NotesController_1.default));
// DELETE /api/notes/:id - Delete note
router.delete("/:id", NotesController_1.default.delete.bind(NotesController_1.default));
// POST /api/notes/:id/toggle-pin - Toggle pin
router.post("/:id/toggle-pin", NotesController_1.default.togglePin.bind(NotesController_1.default));
exports.default = router;
