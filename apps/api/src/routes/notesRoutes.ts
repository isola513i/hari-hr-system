import { Router } from "express";
import NotesController from "../controllers/NotesController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// All notes routes require authentication
router.use(authenticateToken);

// GET /api/notes - Get all notes
router.get("/", NotesController.getAll.bind(NotesController));

// GET /api/notes/:id - Get single note
router.get("/:id", NotesController.getById.bind(NotesController));

// POST /api/notes - Create note
router.post("/", NotesController.create.bind(NotesController));

// PATCH /api/notes/:id - Update note
router.patch("/:id", NotesController.update.bind(NotesController));

// DELETE /api/notes/:id - Delete note
router.delete("/:id", NotesController.delete.bind(NotesController));

// POST /api/notes/:id/toggle-pin - Toggle pin
router.post("/:id/toggle-pin", NotesController.togglePin.bind(NotesController));

export default router;
