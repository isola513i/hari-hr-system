import { Router } from "express";
import OnboardingController from "../controllers/OnboardingController";
import { authenticateToken, requireAdmin } from "../middlewares/auth";
import { apiLimiter } from "../middlewares/security";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Multer config for onboarding document uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads/onboarding");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

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
  upload.single("file"),
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
