import { Router } from "express";
import NotesController from "../controllers/NotesController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// All notes routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/notes:
 *   get:
 *     summary: Get all notes for the current user
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notes
 *       401: { description: Unauthorized }
 */
// GET /api/notes - Get all notes
router.get("/", NotesController.getAll.bind(NotesController));

/**
 * @swagger
 * /api/notes/{id}:
 *   get:
 *     summary: Get a single note by ID
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Note ID
 *     responses:
 *       200:
 *         description: Note details
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
// GET /api/notes/:id - Get single note
router.get("/:id", NotesController.getById.bind(NotesController));

/**
 * @swagger
 * /api/notes:
 *   post:
 *     summary: Create a new note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string }
 *               color: { type: string }
 *               pinned: { type: boolean }
 *     responses:
 *       201:
 *         description: Note created successfully
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
// POST /api/notes - Create note
router.post("/", NotesController.create.bind(NotesController));

/**
 * @swagger
 * /api/notes/{id}:
 *   patch:
 *     summary: Update an existing note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Note ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content: { type: string }
 *               color: { type: string }
 *               pinned: { type: boolean }
 *     responses:
 *       200:
 *         description: Note updated successfully
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
// PATCH /api/notes/:id - Update note
router.patch("/:id", NotesController.update.bind(NotesController));

/**
 * @swagger
 * /api/notes/{id}:
 *   delete:
 *     summary: Delete a note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Note ID
 *     responses:
 *       200:
 *         description: Note deleted successfully
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
// DELETE /api/notes/:id - Delete note
router.delete("/:id", NotesController.delete.bind(NotesController));

/**
 * @swagger
 * /api/notes/{id}/toggle-pin:
 *   post:
 *     summary: Toggle the pinned status of a note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Note ID
 *     responses:
 *       200:
 *         description: Note pin status toggled successfully
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
// POST /api/notes/:id/toggle-pin - Toggle pin
router.post("/:id/toggle-pin", NotesController.togglePin.bind(NotesController));

export default router;
