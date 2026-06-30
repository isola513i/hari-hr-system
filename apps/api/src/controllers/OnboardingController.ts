import { Request, Response } from "express";
import OnboardingService from "../services/OnboardingService";
import { VALID_STAGES, VALID_PRIORITIES, VALID_DOC_STATUSES } from "../models/Onboarding";
import path from "path";
import { storageService } from "../services/StorageService";
import { generateStorageKey, getFileBuffer } from "../middlewares/upload";
import logger from '../utils/logger';

/**
 * Maps an Edit-Profile attachment slot to its canonical onboarding checklist
 * document name, so a passbook / ID copy uploaded from the profile targets the
 * same checklist item shown during onboarding.
 */
const PROFILE_DOC_SLOTS: Record<string, string> = {
  'national-id': 'ID / Passport Copy',
  'bank-account': 'Bank Account Details',
};

export class OnboardingController {
  // GET /api/onboarding/tasks?employeeId=xxx
  async getTasks(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { employeeId } = req.query;

      // EMPLOYEE role → only their own tasks (auto-seed if first visit)
      if (user.role === "EMPLOYEE") {
        if (!user.employeeId) {
          res.status(403).json({ error: "No employee profile linked" });
          return;
        }
        let tasks = await OnboardingService.getTasksByEmployeeId(user.employeeId);
        if (tasks.length === 0) {
          try {
            tasks = await OnboardingService.seedDefaultTasks(user.employeeId);
          } catch {
            // Seed failed (e.g. employee not found) — return empty
          }
        }
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
      logger.error(error, "Error fetching onboarding tasks:");
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
      logger.error(error, "Error creating onboarding task:");
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
      logger.error(error, "Error updating onboarding task:");
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
      logger.error(error, "Error deleting onboarding task:");
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
      logger.error(error, "Error seeding onboarding tasks:");
      res.status(500).json({ error: "Failed to seed tasks" });
    }
  }

  // GET /api/onboarding/contacts
  async getContacts(_req: Request, res: Response): Promise<void> {
    try {
      const contacts = await OnboardingService.getAllContacts();
      res.json(contacts);
    } catch (error) {
      logger.error(error, "Error fetching contacts:");
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  }

  // POST /api/onboarding/contacts
  async createContact(req: Request, res: Response): Promise<void> {
    try {
      const { name, role, relation, email } = req.body;
      if (!name || !role || !email) {
        res.status(400).json({ error: "Name, role, and email are required" });
        return;
      }
      const contact = await OnboardingService.createContact({ name, role, relation: relation || '', email });
      res.status(201).json(contact);
    } catch (error) {
      logger.error(error, "Error creating contact:");
      res.status(500).json({ error: "Failed to create contact" });
    }
  }

  // PUT /api/onboarding/contacts/:id
  async updateContact(req: Request, res: Response): Promise<void> {
    try {
      const { name, role, relation, email } = req.body;
      const contact = await OnboardingService.updateContact(req.params.id, { name, role, relation, email });
      if (!contact) { res.status(404).json({ error: "Contact not found" }); return; }
      res.json(contact);
    } catch (error) {
      logger.error(error, "Error updating contact:");
      res.status(500).json({ error: "Failed to update contact" });
    }
  }

  // DELETE /api/onboarding/contacts/:id
  async deleteContact(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await OnboardingService.deleteContact(req.params.id);
      if (!deleted) { res.status(404).json({ error: "Contact not found" }); return; }
      res.json({ message: "Contact deleted" });
    } catch (error) {
      logger.error(error, "Error deleting contact:");
      res.status(500).json({ error: "Failed to delete contact" });
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
      logger.error(error, "Error fetching onboarding documents:");
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  }

  // Store an uploaded file in object storage and record it against a checklist row.
  private async persistOnboardingFile(id: string, file: any) {
    const key = generateStorageKey("onboarding", file);
    const buffer = getFileBuffer(file);
    await storageService.upload({ key, body: buffer, contentType: file.mimetype });

    const ext = path.extname(file.originalname).replace(".", "").toUpperCase();
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1) + " MB";

    return OnboardingService.uploadDocument(id, key, ext, sizeMB);
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

      const doc = await this.persistOnboardingFile(id, file);
      if (!doc) {
        res.status(404).json({ error: "Document checklist item not found" });
        return;
      }

      res.json(doc);
    } catch (error) {
      logger.error(error, "Error uploading onboarding document:");
      res.status(500).json({ error: "Failed to upload document" });
    }
  }

  // POST /api/onboarding/employees/:employeeId/documents/:slot/upload
  // Profile bridge: attach a file to a PII-linked checklist item (passbook, ID copy)
  // from the Edit Profile modal. Resolves the slot to its canonical onboarding
  // document, ensuring the row exists, then stores the file — so the same upload
  // shows up on the Onboarding checklist.
  async uploadProfileDocument(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId, slot } = req.params;
      const name = PROFILE_DOC_SLOTS[slot];
      if (!name) {
        res.status(400).json({ error: "Unknown document slot" });
        return;
      }
      const file = (req as any).file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const id = await OnboardingService.ensureDocument(employeeId, name);
      const doc = await this.persistOnboardingFile(id, file);
      res.json(doc);
    } catch (error) {
      logger.error(error, "Error uploading profile document:");
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
      logger.error(error, "Error reviewing onboarding document:");
      res.status(500).json({ error: "Failed to review document" });
    }
  }

  // GET /api/onboarding/documents/:id/download
  async downloadDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const result = await OnboardingService.getDocumentFilePath(id);

      if (!result || !result.filePath) {
        res.status(404).json({ error: "File not found" });
        return;
      }

      // Ownership check
      if (user.role !== "HR_ADMIN" && user.employeeId !== result.employeeId) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      const key = result.filePath;
      const { body, contentType, contentLength } = await storageService.download(key);

      const ext = path.extname(key);
      const filename = result.name.replace(/[^a-zA-Z0-9-_ ]/g, "") + ext;

      res.setHeader("Content-Type", contentType);
      if (contentLength) res.setHeader("Content-Length", contentLength);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);

      body.pipe(res);
    } catch (error) {
      logger.error(error, "Error downloading onboarding document:");
      res.status(500).json({ error: "Failed to download document" });
    }
  }
}

export default new OnboardingController();
