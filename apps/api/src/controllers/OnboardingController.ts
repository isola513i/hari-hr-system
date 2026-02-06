import { Request, Response } from "express";
import OnboardingService from "../services/OnboardingService";
import { VALID_STAGES, VALID_PRIORITIES, VALID_DOC_STATUSES } from "../models/Onboarding";
import path from "path";
import fs from "fs";

export class OnboardingController {
  // GET /api/onboarding/tasks?employeeId=xxx
  async getTasks(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { employeeId } = req.query;

      // EMPLOYEE role → only their own tasks
      if (user.role === "EMPLOYEE") {
        if (!user.employeeId) {
          res.status(403).json({ error: "No employee profile linked" });
          return;
        }
        const tasks = await OnboardingService.getTasksByEmployeeId(user.employeeId);
        res.json(tasks);
        return;
      }

      // HR_ADMIN → filter by employeeId or get all
      if (employeeId) {
        const tasks = await OnboardingService.getTasksByEmployeeId(employeeId as string);
        res.json(tasks);
      } else {
        const tasks = await OnboardingService.getAllTasks();
        res.json(tasks);
      }
    } catch (error) {
      console.error("Error fetching onboarding tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  }

  // POST /api/onboarding/tasks
  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, stage, assignee, dueDate, priority, link, employeeId } = req.body;

      // Validate required fields
      if (!title || !stage || !assignee || !dueDate || !priority || !employeeId) {
        res.status(400).json({
          error: "Missing required fields: title, stage, assignee, dueDate, priority, employeeId",
        });
        return;
      }

      // Validate enums
      if (!VALID_STAGES.includes(stage)) {
        res.status(400).json({ error: `Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}` });
        return;
      }
      if (!VALID_PRIORITIES.includes(priority)) {
        res.status(400).json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` });
        return;
      }

      const task = await OnboardingService.createTask({
        title,
        description,
        stage,
        assignee,
        dueDate,
        priority,
        link,
        employeeId,
      });

      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating onboarding task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  }

  // PATCH /api/onboarding/tasks/:id
  async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { stage, priority, ...rest } = req.body;

      // Validate enums if provided
      if (stage && !VALID_STAGES.includes(stage)) {
        res.status(400).json({ error: `Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}` });
        return;
      }
      if (priority && !VALID_PRIORITIES.includes(priority)) {
        res.status(400).json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` });
        return;
      }

      const task = await OnboardingService.updateTask(id, { stage, priority, ...rest });

      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }

      res.json(task);
    } catch (error) {
      console.error("Error updating onboarding task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }

  // DELETE /api/onboarding/tasks/:id
  async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await OnboardingService.deleteTask(id);

      if (!success) {
        res.status(404).json({ error: "Task not found" });
        return;
      }

      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting onboarding task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  }

  // POST /api/onboarding/tasks/seed/:employeeId
  async seedTasks(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;

      // Check if tasks already exist for this employee
      const hasExisting = await OnboardingService.hasExistingTasks(employeeId);
      if (hasExisting) {
        res.status(409).json({ error: "Tasks already exist for this employee" });
        return;
      }

      const tasks = await OnboardingService.seedDefaultTasks(employeeId);
      res.status(201).json(tasks);
    } catch (error: any) {
      if (error.message === "Employee not found") {
        res.status(404).json({ error: "Employee not found" });
        return;
      }
      console.error("Error seeding onboarding tasks:", error);
      res.status(500).json({ error: "Failed to seed tasks" });
    }
  }

  // GET /api/onboarding/contacts
  async getContacts(_req: Request, res: Response): Promise<void> {
    try {
      const contacts = await OnboardingService.getAllContacts();
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  }

  // ==========================================
  // Document Checklist Endpoints
  // ==========================================

  // GET /api/onboarding/documents?employeeId=xxx
  async getDocuments(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { employeeId } = req.query;

      if (user.role === "EMPLOYEE") {
        if (!user.employeeId) {
          res.status(403).json({ error: "No employee profile linked" });
          return;
        }
        const docs = await OnboardingService.getDocumentsByEmployeeId(user.employeeId);
        res.json(docs);
        return;
      }

      if (employeeId) {
        const docs = await OnboardingService.getDocumentsByEmployeeId(employeeId as string);
        res.json(docs);
      } else {
        const docs = await OnboardingService.getAllDocuments();
        res.json(docs);
      }
    } catch (error) {
      console.error("Error fetching onboarding documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  }

  // POST /api/onboarding/documents/:id/upload
  async uploadDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const file = (req as any).file;

      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const ext = path.extname(file.originalname).replace(".", "").toUpperCase();
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1) + " MB";

      const doc = await OnboardingService.uploadDocument(id, file.path, ext, sizeMB);
      if (!doc) {
        res.status(404).json({ error: "Document checklist item not found" });
        return;
      }

      res.json(doc);
    } catch (error) {
      console.error("Error uploading onboarding document:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  }

  // PATCH /api/onboarding/documents/:id/review
  async reviewDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, note } = req.body;
      const user = (req as any).user;

      if (!status || !["Approved", "Rejected"].includes(status)) {
        res.status(400).json({ error: "Status must be 'Approved' or 'Rejected'" });
        return;
      }

      const doc = await OnboardingService.reviewDocument(id, user.userId, status, note);
      if (!doc) {
        res.status(404).json({ error: "Document not found" });
        return;
      }

      res.json(doc);
    } catch (error) {
      console.error("Error reviewing onboarding document:", error);
      res.status(500).json({ error: "Failed to review document" });
    }
  }

  // GET /api/onboarding/documents/:id/download
  async downloadDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await OnboardingService.getDocumentFilePath(id);

      if (!result || !result.filePath) {
        res.status(404).json({ error: "File not found" });
        return;
      }

      if (!fs.existsSync(result.filePath)) {
        res.status(404).json({ error: "File not found on disk" });
        return;
      }

      const ext = path.extname(result.filePath);
      const filename = result.name.replace(/[^a-zA-Z0-9-_ ]/g, "") + ext;
      res.download(result.filePath, filename);
    } catch (error) {
      console.error("Error downloading onboarding document:", error);
      res.status(500).json({ error: "Failed to download document" });
    }
  }
}

export default new OnboardingController();
