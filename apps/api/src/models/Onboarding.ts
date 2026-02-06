// ==========================================
// Database Row Interfaces (snake_case)
// ==========================================

export interface OnboardingTaskRow {
  id: string;
  title: string;
  description: string | null;
  stage: string | null;
  assignee: string | null;
  due_date: string | null;
  completed: boolean;
  priority: string | null;
  link: string | null;
  employee_id: string | null;
}

export interface KeyContactRow {
  id: string;
  name: string | null;
  role: string | null;
  relation: string | null;
  email: string | null;
  avatar: string | null;
}

export interface OnboardingDocumentRow {
  id: string;
  employee_id: string;
  name: string;
  description: string | null;
  status: string;
  file_path: string | null;
  file_type: string | null;
  file_size: string | null;
  uploaded_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

// ==========================================
// DTOs (Request)
// ==========================================

export interface CreateOnboardingTaskDTO {
  title: string;
  description?: string;
  stage: 'Pre-boarding' | 'Week 1' | 'Month 1';
  assignee: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  link?: string;
  employeeId: string;
}

export interface UpdateOnboardingTaskDTO {
  title?: string;
  description?: string;
  stage?: 'Pre-boarding' | 'Week 1' | 'Month 1';
  assignee?: string;
  dueDate?: string;
  completed?: boolean;
  priority?: 'High' | 'Medium' | 'Low';
  link?: string;
}

// ==========================================
// Response Types (camelCase for frontend)
// ==========================================

export interface OnboardingTaskResponse {
  id: string;
  title: string;
  description: string;
  stage: string;
  assignee: string;
  dueDate: string;
  completed: boolean;
  priority: string;
  link: string | null;
  employeeId: string | null;
}

export interface KeyContactResponse {
  id: string;
  name: string;
  role: string;
  relation: string;
  email: string;
  avatar: string;
}

export interface OnboardingDocumentResponse {
  id: string;
  employeeId: string;
  name: string;
  description: string;
  status: string;
  filePath: string | null;
  fileType: string | null;
  fileSize: string | null;
  uploadedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}

// ==========================================
// Enums / Validation Constants
// ==========================================

export const VALID_STAGES = ['Pre-boarding', 'Week 1', 'Month 1'] as const;
export const VALID_PRIORITIES = ['High', 'Medium', 'Low'] as const;
export const VALID_DOC_STATUSES = ['Pending', 'Uploaded', 'Approved', 'Rejected'] as const;
