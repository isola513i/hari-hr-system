import type { OnboardingStage, OnboardingPriority, OnboardingDocStatus } from '@hari/shared-types';

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
  stage: OnboardingStage;
  assignee: string;
  dueDate: string;
  priority: OnboardingPriority;
  link?: string;
  employeeId: string;
}

export interface UpdateOnboardingTaskDTO {
  title?: string;
  description?: string;
  stage?: OnboardingStage;
  assignee?: string;
  dueDate?: string;
  completed?: boolean;
  priority?: OnboardingPriority;
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

export const VALID_STAGES: readonly OnboardingStage[] = ['Pre-boarding', 'Week 1', 'Month 1'];
export const VALID_PRIORITIES: readonly OnboardingPriority[] = ['High', 'Medium', 'Low'];
export const VALID_DOC_STATUSES: readonly OnboardingDocStatus[] = ['Pending', 'Uploaded', 'Approved', 'Rejected'];
