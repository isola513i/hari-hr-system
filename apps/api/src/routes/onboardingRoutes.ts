import { Router } from "express";
import OnboardingController from "../controllers/OnboardingController";
import { authenticateToken, requireAdmin } from "../middlewares/auth";
import { apiLimiter } from "../middlewares/security";
import { onboardingDocUpload } from "../middlewares/upload";

const router = Router();

// All onboarding routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/onboarding/tasks:
 *   get:
 *     summary: List onboarding tasks (employee sees own, admin sees all or filtered)
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema: { type: string, format: uuid }
 *         description: Filter tasks by employee (admin only)
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, in_progress, completed] }
 *         description: Filter by task status
 *     responses:
 *       200:
 *         description: List of onboarding tasks
 *       401: { description: Unauthorized }
 */
// GET /api/onboarding/tasks - Get tasks (EMPLOYEE sees own, ADMIN sees all or filtered)
router.get(
  "/tasks",
  OnboardingController.getTasks.bind(OnboardingController)
);

/**
 * @swagger
 * /api/onboarding/tasks:
 *   post:
 *     summary: Create a new onboarding task (admin only)
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, employeeId]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               employeeId: { type: string, format: uuid }
 *               dueDate: { type: string, format: date }
 *               priority: { type: string, enum: [low, medium, high] }
 *     responses:
 *       201:
 *         description: Onboarding task created
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Admin access required }
 */
// POST /api/onboarding/tasks - Create a new task (Admin only)
router.post(
  "/tasks",
  requireAdmin,
  apiLimiter,
  OnboardingController.createTask.bind(OnboardingController)
);

/**
 * @swagger
 * /api/onboarding/tasks/seed/{employeeId}:
 *   post:
 *     summary: Seed default onboarding tasks for an employee (admin only)
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Employee to seed default tasks for
 *     responses:
 *       201:
 *         description: Default tasks seeded successfully
 *       401: { description: Unauthorized }
 *       403: { description: Admin access required }
 *       404: { description: Employee not found }
 */
// POST /api/onboarding/tasks/seed/:employeeId - Seed default tasks (Admin only)
// NOTE: This must be before /tasks/:id to avoid route conflict
router.post(
  "/tasks/seed/:employeeId",
  requireAdmin,
  apiLimiter,
  OnboardingController.seedTasks.bind(OnboardingController)
);

/**
 * @swagger
 * /api/onboarding/tasks/{id}:
 *   patch:
 *     summary: Update an onboarding task
 *     tags: [Onboarding]
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
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               status: { type: string, enum: [pending, in_progress, completed] }
 *               dueDate: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Task updated
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: Task not found }
 */
// PATCH /api/onboarding/tasks/:id - Update a task (Any authenticated user)
router.patch(
  "/tasks/:id",
  apiLimiter,
  OnboardingController.updateTask.bind(OnboardingController)
);

/**
 * @swagger
 * /api/onboarding/tasks/{id}:
 *   delete:
 *     summary: Delete an onboarding task (admin only)
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Task deleted
 *       401: { description: Unauthorized }
 *       403: { description: Admin access required }
 *       404: { description: Task not found }
 */
// DELETE /api/onboarding/tasks/:id - Delete a task (Admin only)
router.delete(
  "/tasks/:id",
  requireAdmin,
  apiLimiter,
  OnboardingController.deleteTask.bind(OnboardingController)
);

/**
 * @swagger
 * /api/onboarding/contacts:
 *   get:
 *     summary: List key onboarding contacts
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of key contacts
 *       401: { description: Unauthorized }
 */
// GET /api/onboarding/contacts - Get key contacts
router.get(
  "/contacts",
  OnboardingController.getContacts.bind(OnboardingController)
);

/**
 * @swagger
 * /api/onboarding/contacts:
 *   post:
 *     summary: Create a key onboarding contact (admin only)
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, role]
 *             properties:
 *               name: { type: string }
 *               role: { type: string }
 *               department: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *     responses:
 *       201:
 *         description: Contact created
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Admin access required }
 */
// POST /api/onboarding/contacts - Create contact (admin only)
router.post(
  "/contacts",
  requireAdmin,
  apiLimiter,
  OnboardingController.createContact.bind(OnboardingController)
);

/**
 * @swagger
 * /api/onboarding/contacts/{id}:
 *   put:
 *     summary: Update a key onboarding contact (admin only)
 *     tags: [Onboarding]
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
 *             properties:
 *               name: { type: string }
 *               role: { type: string }
 *               department: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *     responses:
 *       200:
 *         description: Contact updated
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Admin access required }
 *       404: { description: Contact not found }
 */
// PUT /api/onboarding/contacts/:id - Update contact (admin only)
router.put(
  "/contacts/:id",
  requireAdmin,
  apiLimiter,
  OnboardingController.updateContact.bind(OnboardingController)
);

/**
 * @swagger
 * /api/onboarding/contacts/{id}:
 *   delete:
 *     summary: Delete a key onboarding contact (admin only)
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Contact deleted
 *       401: { description: Unauthorized }
 *       403: { description: Admin access required }
 *       404: { description: Contact not found }
 */
// DELETE /api/onboarding/contacts/:id - Delete contact (admin only)
router.delete(
  "/contacts/:id",
  requireAdmin,
  apiLimiter,
  OnboardingController.deleteContact.bind(OnboardingController)
);

// ==========================================
// Document Checklist Routes
// ==========================================

/**
 * @swagger
 * /api/onboarding/documents:
 *   get:
 *     summary: Get document checklist (employee sees own, admin sees all or filtered)
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema: { type: string, format: uuid }
 *         description: Filter by employee (admin only)
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, uploaded, approved, rejected] }
 *         description: Filter by document status
 *     responses:
 *       200:
 *         description: List of document checklist items
 *       401: { description: Unauthorized }
 */
// GET /api/onboarding/documents - Get document checklist
router.get(
  "/documents",
  OnboardingController.getDocuments.bind(OnboardingController)
);

/**
 * @swagger
 * /api/onboarding/documents/{id}/upload:
 *   post:
 *     summary: Upload a file for a document checklist item
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Document checklist item ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Document file to upload
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400: { description: No file provided or invalid file type }
 *       401: { description: Unauthorized }
 *       404: { description: Document checklist item not found }
 */
// POST /api/onboarding/documents/:id/upload - Upload file for checklist item
router.post(
  "/documents/:id/upload",
  apiLimiter,
  onboardingDocUpload.single("file"),
  OnboardingController.uploadDocument.bind(OnboardingController)
);

// POST /api/onboarding/employees/:employeeId/documents/:slot/upload
// Profile bridge (admin) — attach a passbook / ID copy from the Edit Profile modal
// to the matching onboarding checklist item.
router.post(
  "/employees/:employeeId/documents/:slot/upload",
  requireAdmin,
  apiLimiter,
  onboardingDocUpload.single("file"),
  OnboardingController.uploadProfileDocument.bind(OnboardingController)
);

/**
 * @swagger
 * /api/onboarding/documents/{id}/review:
 *   patch:
 *     summary: Approve or reject an uploaded document (admin only)
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Document checklist item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [approved, rejected] }
 *               notes: { type: string, description: Reviewer notes or rejection reason }
 *     responses:
 *       200:
 *         description: Document review decision recorded
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Admin access required }
 *       404: { description: Document checklist item not found }
 */
// PATCH /api/onboarding/documents/:id/review - Approve/Reject (Admin only)
router.patch(
  "/documents/:id/review",
  requireAdmin,
  apiLimiter,
  OnboardingController.reviewDocument.bind(OnboardingController)
);

/**
 * @swagger
 * /api/onboarding/documents/{id}/download:
 *   get:
 *     summary: Download the uploaded file for a document checklist item
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Document checklist item ID
 *     responses:
 *       200:
 *         description: File stream returned for download
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401: { description: Unauthorized }
 *       404: { description: Document or file not found }
 */
// GET /api/onboarding/documents/:id/download - Download uploaded file
router.get(
  "/documents/:id/download",
  OnboardingController.downloadDocument.bind(OnboardingController)
);

export default router;
