import { Router } from "express";
import SurveyController from "../controllers/SurveyController";
import { authenticateToken, requireAdmin } from "../middlewares/auth";

const router = Router();

// All survey routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/surveys/sentiment:
 *   get:
 *     summary: Get aggregated sentiment analytics across surveys
 *     tags: [Surveys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sentiment analytics retrieved successfully
 *       401: { description: Unauthorized }
 */
// GET /api/surveys/sentiment - Must be before /:id to avoid conflict
router.get("/sentiment", SurveyController.sentiment.bind(SurveyController));

/**
 * @swagger
 * /api/surveys:
 *   get:
 *     summary: List all surveys
 *     tags: [Surveys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, closed] }
 *         description: Filter surveys by status
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: List of surveys retrieved successfully
 *       401: { description: Unauthorized }
 */
// GET /api/surveys - List all surveys
router.get("/", SurveyController.list.bind(SurveyController));

/**
 * @swagger
 * /api/surveys/{id}:
 *   get:
 *     summary: Get survey detail by ID
 *     tags: [Surveys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Survey detail retrieved successfully
 *       401: { description: Unauthorized }
 *       404: { description: Survey not found }
 */
// GET /api/surveys/:id - Survey detail
router.get("/:id", SurveyController.detail.bind(SurveyController));

/**
 * @swagger
 * /api/surveys:
 *   post:
 *     summary: Create a new survey (admin only)
 *     tags: [Surveys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, questions]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     text: { type: string }
 *                     type: { type: string, enum: [text, rating, multiple_choice] }
 *                     options: { type: array, items: { type: string } }
 *               targetEmployeeIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Survey created successfully
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin only }
 */
// POST /api/surveys - Create survey (admin only)
router.post("/", requireAdmin, SurveyController.create.bind(SurveyController));

/**
 * @swagger
 * /api/surveys/{id}/respond:
 *   post:
 *     summary: Submit a response to a survey
 *     tags: [Surveys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [answers]
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId: { type: string, format: uuid }
 *                     value: { type: string }
 *     responses:
 *       201:
 *         description: Response submitted successfully
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: Survey not found }
 */
// POST /api/surveys/:id/respond - Submit response (any authenticated user)
router.post("/:id/respond", SurveyController.respond.bind(SurveyController));

/**
 * @swagger
 * /api/surveys/{id}/close:
 *   patch:
 *     summary: Close a survey to prevent further responses (admin only)
 *     tags: [Surveys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Survey closed successfully
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin only }
 *       404: { description: Survey not found }
 */
// PATCH /api/surveys/:id/close - Close survey (admin only)
router.patch("/:id/close", requireAdmin, SurveyController.close.bind(SurveyController));

/**
 * @swagger
 * /api/surveys/{id}/reopen:
 *   patch:
 *     summary: Reopen a closed survey to accept responses again (admin only)
 *     tags: [Surveys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Survey reopened successfully
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin only }
 *       404: { description: Survey not found }
 */
// PATCH /api/surveys/:id/reopen - Reopen closed survey (admin only)
router.patch("/:id/reopen", requireAdmin, SurveyController.reopen.bind(SurveyController));

/**
 * @swagger
 * /api/surveys/{id}:
 *   delete:
 *     summary: Delete a survey (admin only)
 *     tags: [Surveys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Survey deleted successfully
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin only }
 *       404: { description: Survey not found }
 */
// DELETE /api/surveys/:id - Delete survey (admin only)
router.delete("/:id", requireAdmin, SurveyController.delete.bind(SurveyController));

export default router;
