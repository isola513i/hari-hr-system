import { Router } from "express";
import OnboardingController from "../controllers/OnboardingController";
import { authenticateToken, requireAdmin } from "../middlewares/auth";
import { apiLimiter } from "../middlewares/security";
import { onboardingDocUpload } from "../middlewares/upload";

const router = Router();

// All onboarding routes require authentication
router.use(authenticateToken);

// GET /api/onboarding/tasks - Get tasks (EMPLOYEE sees own, ADMIN sees all or filtered)
router.get(
  "/tasks",
  OnboardingController.getTasks.bind(OnboardingController)
);

// POST /api/onboarding/tasks - Create a new task (Admin only)
router.post(
  "/tasks",
  requireAdmin,
  apiLimiter,
  OnboardingController.createTask.bind(OnboardingController)
);

// POST /api/onboarding/tasks/seed/:employeeId - Seed default tasks (Admin only)
// NOTE: This must be before /tasks/:id to avoid route conflict
router.post(
  "/tasks/seed/:employeeId",
  requireAdmin,
  apiLimiter,
  OnboardingController.seedTasks.bind(OnboardingController)
);

// PATCH /api/onboarding/tasks/:id - Update a task (Any authenticated user)
router.patch(
  "/tasks/:id",
  apiLimiter,
  OnboardingController.updateTask.bind(OnboardingController)
);

// DELETE /api/onboarding/tasks/:id - Delete a task (Admin only)
router.delete(
  "/tasks/:id",
  requireAdmin,
  apiLimiter,
  OnboardingController.deleteTask.bind(OnboardingController)
);

// GET /api/onboarding/contacts - Get key contacts
router.get(
  "/contacts",
  OnboardingController.getContacts.bind(OnboardingController)
);

// POST /api/onboarding/contacts - Create contact (admin only)
router.post(
  "/contacts",
  requireAdmin,
  apiLimiter,
  OnboardingController.createContact.bind(OnboardingController)
);

// PUT /api/onboarding/contacts/:id - Update contact (admin only)
router.put(
  "/contacts/:id",
  requireAdmin,
  apiLimiter,
  OnboardingController.updateContact.bind(OnboardingController)
);

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

// GET /api/onboarding/documents - Get document checklist
router.get(
  "/documents",
  OnboardingController.getDocuments.bind(OnboardingController)
);

// POST /api/onboarding/documents/:id/upload - Upload file for checklist item
router.post(
  "/documents/:id/upload",
  apiLimiter,
  onboardingDocUpload.single("file"),
  OnboardingController.uploadDocument.bind(OnboardingController)
);

// PATCH /api/onboarding/documents/:id/review - Approve/Reject (Admin only)
router.patch(
  "/documents/:id/review",
  requireAdmin,
  apiLimiter,
  OnboardingController.reviewDocument.bind(OnboardingController)
);

// GET /api/onboarding/documents/:id/download - Download uploaded file
router.get(
  "/documents/:id/download",
  OnboardingController.downloadDocument.bind(OnboardingController)
);

export default router;
