import { query } from "../db";
import {
  OnboardingTaskRow,
  KeyContactRow,
  OnboardingDocumentRow,
  CreateOnboardingTaskDTO,
  UpdateOnboardingTaskDTO,
  OnboardingTaskResponse,
  KeyContactResponse,
  OnboardingDocumentResponse,
} from "../models/Onboarding";
import NotificationService from "./NotificationService";

// ==========================================
// Row → Response Mappers
// ==========================================

function mapTaskRow(row: OnboardingTaskRow): OnboardingTaskResponse {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    stage: row.stage || "Pre-boarding",
    assignee: row.assignee || "HR",
    dueDate: row.due_date || "",
    completed: row.completed,
    priority: row.priority || "Medium",
    link: row.link || null,
    employeeId: row.employee_id || null,
  };
}

function mapContactRow(row: KeyContactRow): KeyContactResponse {
  return {
    id: row.id,
    name: row.name || "",
    role: row.role || "",
    relation: row.relation || "",
    email: row.email || "",
    avatar: row.avatar || "",
  };
}

function mapDocumentRow(row: OnboardingDocumentRow): OnboardingDocumentResponse {
  return {
    id: row.id,
    employeeId: row.employee_id,
    name: row.name,
    description: row.description || "",
    status: row.status,
    filePath: row.file_path,
    fileType: row.file_type,
    fileSize: row.file_size,
    uploadedAt: row.uploaded_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    createdAt: row.created_at,
  };
}

// ==========================================
// Default Tasks Template (12 tasks)
// ==========================================

interface DefaultTask {
  title: string;
  description: string;
  stage: "Pre-boarding" | "Week 1" | "Month 1";
  assignee: string;
  priority: "High" | "Medium" | "Low";
  dueDaysOffset: number; // days relative to join_date
  link?: string;
}

const DEFAULT_TASKS: DefaultTask[] = [
  // Pre-boarding (4)
  {
    title: "Complete Personal Information Form",
    description: "Fill out all personal details, emergency contacts, and tax information",
    stage: "Pre-boarding",
    assignee: "Employee",
    priority: "High",
    dueDaysOffset: -3,
  },
  {
    title: "Sign Offer Letter & Employment Agreement",
    description: "Review and digitally sign the official offer letter and employment contract",
    stage: "Pre-boarding",
    assignee: "Employee",
    priority: "High",
    dueDaysOffset: -5,
  },
  {
    title: "Set Up IT Accounts & Credentials",
    description: "Create email, Slack, and system access credentials for the new employee",
    stage: "Pre-boarding",
    assignee: "IT",
    priority: "High",
    dueDaysOffset: -1,
  },
  {
    title: "Prepare Workspace & Equipment",
    description: "Set up desk, chair, monitor, laptop, and any required peripherals",
    stage: "Pre-boarding",
    assignee: "IT",
    priority: "Medium",
    dueDaysOffset: -1,
  },
  // Week 1 (5)
  {
    title: "Attend Company Orientation",
    description: "Join the welcome session covering company history, mission, values, and culture",
    stage: "Week 1",
    assignee: "Employee",
    priority: "High",
    dueDaysOffset: 0,
  },
  {
    title: "Meet Your Team & Key Stakeholders",
    description: "Introductory meetings with team members, cross-functional partners, and leadership",
    stage: "Week 1",
    assignee: "Employee",
    priority: "Medium",
    dueDaysOffset: 2,
  },
  {
    title: "Review Company Policies & Handbook",
    description: "Read through the employee handbook, code of conduct, and HR policies",
    stage: "Week 1",
    assignee: "Employee",
    priority: "Medium",
    dueDaysOffset: 3,
    link: "/documents",
  },
  {
    title: "Set Up Development Environment",
    description: "Install required tools, clone repositories, and configure local development setup",
    stage: "Week 1",
    assignee: "Employee",
    priority: "High",
    dueDaysOffset: 1,
  },
  {
    title: "Schedule 1:1 with Manager",
    description: "Book an introductory one-on-one meeting to discuss role expectations and goals",
    stage: "Week 1",
    assignee: "HR",
    priority: "Medium",
    dueDaysOffset: 4,
  },
  // Month 1 (3)
  {
    title: "Complete Compliance Training",
    description: "Finish all mandatory compliance, safety, and security training modules",
    stage: "Month 1",
    assignee: "Employee",
    priority: "High",
    dueDaysOffset: 14,
  },
  {
    title: "Enroll in Benefits Program",
    description: "Select health insurance, retirement plan, and other employee benefits",
    stage: "Month 1",
    assignee: "Employee",
    priority: "Medium",
    dueDaysOffset: 21,
  },
  {
    title: "30-Day HR Check-in",
    description: "Scheduled check-in with HR to review onboarding progress and address any concerns",
    stage: "Month 1",
    assignee: "HR",
    priority: "Low",
    dueDaysOffset: 30,
  },
];

// ==========================================
// Default Document Checklist Template (6 items)
// ==========================================

interface DefaultDocument {
  name: string;
  description: string;
}

const DEFAULT_DOCUMENTS: DefaultDocument[] = [
  {
    name: "ID / Passport Copy",
    description: "Upload a clear copy of your government-issued ID or passport",
  },
  {
    name: "Signed Employment Contract",
    description: "Upload the signed employment contract",
  },
  {
    name: "Tax Forms (W-4)",
    description: "Upload completed tax withholding forms",
  },
  {
    name: "Bank Account Details",
    description: "Upload bank account information for payroll setup",
  },
  {
    name: "Emergency Contact Form",
    description: "Upload completed emergency contact information form",
  },
  {
    name: "Educational Certificates",
    description: "Upload copies of relevant degrees or certifications",
  },
];

// ==========================================
// Service Class
// ==========================================

export class OnboardingService {
  // Get tasks for a specific employee
  async getTasksByEmployeeId(employeeId: string): Promise<OnboardingTaskResponse[]> {
    const result = await query(
      `SELECT * FROM tasks WHERE employee_id = $1 ORDER BY due_date ASC`,
      [employeeId]
    );
    return result.rows.map(mapTaskRow);
  }

  // Get all tasks (admin view)
  async getAllTasks(): Promise<OnboardingTaskResponse[]> {
    const result = await query(
      `SELECT * FROM tasks ORDER BY due_date ASC`
    );
    return result.rows.map(mapTaskRow);
  }

  // Create a single task
  async createTask(dto: CreateOnboardingTaskDTO): Promise<OnboardingTaskResponse> {
    const result = await query(
      `INSERT INTO tasks (title, description, stage, assignee, due_date, priority, link, employee_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        dto.title,
        dto.description || null,
        dto.stage,
        dto.assignee,
        dto.dueDate,
        dto.priority,
        dto.link || null,
        dto.employeeId,
      ]
    );
    return mapTaskRow(result.rows[0]);
  }

  // Update a task (dynamic fields)
  async updateTask(id: string, dto: UpdateOnboardingTaskDTO): Promise<OnboardingTaskResponse | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (dto.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(dto.title);
    }
    if (dto.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(dto.description);
    }
    if (dto.stage !== undefined) {
      updates.push(`stage = $${paramCount++}`);
      values.push(dto.stage);
    }
    if (dto.assignee !== undefined) {
      updates.push(`assignee = $${paramCount++}`);
      values.push(dto.assignee);
    }
    if (dto.dueDate !== undefined) {
      updates.push(`due_date = $${paramCount++}`);
      values.push(dto.dueDate);
    }
    if (dto.completed !== undefined) {
      updates.push(`completed = $${paramCount++}`);
      values.push(dto.completed);
    }
    if (dto.priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(dto.priority);
    }
    if (dto.link !== undefined) {
      updates.push(`link = $${paramCount++}`);
      values.push(dto.link);
    }

    if (updates.length === 0) {
      return null;
    }

    values.push(id);
    const result = await query(
      `UPDATE tasks SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return mapTaskRow(result.rows[0]);
  }

  // Delete a task
  async deleteTask(id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM tasks WHERE id = $1 RETURNING id`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Seed default tasks for an employee
  async seedDefaultTasks(employeeId: string): Promise<OnboardingTaskResponse[]> {
    // Get employee's join date
    const empResult = await query(
      `SELECT join_date, name, user_id FROM employees WHERE id = $1`,
      [employeeId]
    );

    if (empResult.rows.length === 0) {
      throw new Error("Employee not found");
    }

    const joinDate = empResult.rows[0].join_date
      ? new Date(empResult.rows[0].join_date)
      : new Date();
    const employeeName = empResult.rows[0].name;
    const employeeUserId = empResult.rows[0].user_id;

    // Build bulk INSERT
    const valuesClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const task of DEFAULT_TASKS) {
      const dueDate = new Date(joinDate);
      dueDate.setDate(dueDate.getDate() + task.dueDaysOffset);
      const dueDateStr = dueDate.toISOString().split("T")[0];

      valuesClauses.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`
      );
      params.push(
        task.title,
        task.description,
        task.stage,
        task.assignee,
        dueDateStr,
        task.priority,
        task.link || null,
        employeeId
      );
      paramIndex += 8;
    }

    const result = await query(
      `INSERT INTO tasks (title, description, stage, assignee, due_date, priority, link, employee_id)
       VALUES ${valuesClauses.join(", ")}
       RETURNING *`,
      params
    );

    // Seed default documents
    const docValuesClauses: string[] = [];
    const docParams: any[] = [];
    let docParamIndex = 1;

    for (const doc of DEFAULT_DOCUMENTS) {
      docValuesClauses.push(
        `($${docParamIndex}, $${docParamIndex + 1}, $${docParamIndex + 2})`
      );
      docParams.push(employeeId, doc.name, doc.description);
      docParamIndex += 3;
    }

    await query(
      `INSERT INTO onboarding_documents (employee_id, name, description)
       VALUES ${docValuesClauses.join(", ")}`,
      docParams
    );

    // Update employee onboarding_status
    await query(
      `UPDATE employees SET onboarding_status = 'In Progress', onboarding_percentage = 0 WHERE id = $1`,
      [employeeId]
    );

    // Send notification to the employee (if they have a user account)
    if (employeeUserId) {
      try {
        await NotificationService.create({
          user_id: employeeUserId,
          title: "Onboarding Tasks Assigned",
          message: `Welcome ${employeeName}! Your onboarding checklist with ${DEFAULT_TASKS.length} tasks and ${DEFAULT_DOCUMENTS.length} documents has been created.`,
          type: "info",
          link: "/onboarding",
        });
      } catch {
        // Non-critical — don't fail the seed
      }
    }

    return result.rows.map(mapTaskRow);
  }

  // Check if employee already has tasks
  async hasExistingTasks(employeeId: string): Promise<boolean> {
    const result = await query(
      `SELECT COUNT(*) as count FROM tasks WHERE employee_id = $1`,
      [employeeId]
    );
    return parseInt(result.rows[0].count, 10) > 0;
  }

  // Get all contacts
  async getAllContacts(): Promise<KeyContactResponse[]> {
    const result = await query(`SELECT * FROM contacts ORDER BY name ASC`);
    return result.rows.map(mapContactRow);
  }

  // ==========================================
  // Document Checklist Methods
  // ==========================================

  async getDocumentsByEmployeeId(employeeId: string): Promise<OnboardingDocumentResponse[]> {
    const result = await query(
      `SELECT * FROM onboarding_documents WHERE employee_id = $1 ORDER BY created_at ASC`,
      [employeeId]
    );
    return result.rows.map(mapDocumentRow);
  }

  async getAllDocuments(): Promise<OnboardingDocumentResponse[]> {
    const result = await query(
      `SELECT * FROM onboarding_documents ORDER BY created_at ASC`
    );
    return result.rows.map(mapDocumentRow);
  }

  async uploadDocument(
    id: string,
    filePath: string,
    fileType: string,
    fileSize: string
  ): Promise<OnboardingDocumentResponse | null> {
    const result = await query(
      `UPDATE onboarding_documents
       SET status = 'Uploaded', file_path = $1, file_type = $2, file_size = $3, uploaded_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [filePath, fileType, fileSize, id]
    );
    if (result.rows.length === 0) return null;
    return mapDocumentRow(result.rows[0]);
  }

  async reviewDocument(
    id: string,
    userId: string,
    status: "Approved" | "Rejected",
    note?: string
  ): Promise<OnboardingDocumentResponse | null> {
    const result = await query(
      `UPDATE onboarding_documents
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_note = $3
       WHERE id = $4
       RETURNING *`,
      [status, userId, note || null, id]
    );
    if (result.rows.length === 0) return null;
    return mapDocumentRow(result.rows[0]);
  }

  async getDocumentFilePath(id: string): Promise<{ filePath: string | null; name: string } | null> {
    const result = await query(
      `SELECT file_path, name FROM onboarding_documents WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) return null;
    return { filePath: result.rows[0].file_path, name: result.rows[0].name };
  }
}

export default new OnboardingService();
