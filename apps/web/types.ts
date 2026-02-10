import React from 'react';

// ============================================================================
// Re-exports from shared types (backwards compat for existing imports)
// ============================================================================

export type {
  UserRole,
  User as BackendUser,
  LoginCredentials,
  AuthResponse,
  Employee,
  EmployeeStatus,
  OnboardingStatus,
  LeaveRequest,
  LeaveRequestStatus,
  LeaveBalance,
  NotificationType,
  NotificationItem,
  OnboardingTask,
  OnboardingDocument,
  KeyContact,
  OnboardingStage,
  OnboardingPriority,
  OnboardingDocStatus,
  TeamMember,
  MyTeamHierarchy,
  ChartDataPoint,
  UpcomingEvent,
  AuditLogItem,
  Announcement,
  ComplianceItem,
  OnboardingProgressSummary,
  DocumentItem,
  JobHistoryItem,
  PerformanceReview,
  EmployeeTrainingRecord,
  TrainingModule,
  OrgNode,
} from '@hari/shared-types';

// ============================================================================
// Frontend-only Constants & Types
// ============================================================================

export const DEPARTMENTS = [
  'Human Resources',
  'Engineering',
  'Developer',
  'Marketing',
  'Sales',
  'Finance',
  'Operations',
  'Product',
  'Design',
  'Legal',
  'Customer Support',
  'Tester',
] as const;

export type Department = (typeof DEPARTMENTS)[number];

// ============================================================================
// Frontend User (with `id` instead of `userId`)
// ============================================================================

export interface User {
  id: string;
  employeeId?: string;
  email?: string;
  name: string;
  role: 'HR_ADMIN' | 'EMPLOYEE';
  avatar: string;
  jobTitle: string;
  bio?: string;
  phone?: string;
}

// ============================================================================
// Component Props
// ============================================================================

export interface StatCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  color: 'primary' | 'green' | 'orange' | 'red' | 'teal';
}

// ============================================================================
// API & Network Types
// ============================================================================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
  success?: boolean;
}

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

/**
 * Error object with optional response
 */
export interface NetworkError extends Error {
  response?: {
    status: number;
    data: ApiErrorResponse | Record<string, unknown>;
  };
}

// ============================================================================
// Form Data Types
// ============================================================================

/**
 * Employee creation/update form data
 */
export interface EmployeeFormData {
  name: string;
  email: string;
  role: string;
  department: string;
  jobTitle?: string;
  location?: string;
  joinDate?: string;
  bio?: string;
  slack?: string;
  emergencyContact?: string;
  skills?: string[];
}

/**
 * Password change form data
 */
export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Leave request form data
 */
export interface LeaveRequestFormData {
  type: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

/**
 * Document upload form data
 */
export interface DocumentUploadData {
  file: File;
  category: string;
  name?: string;
}

/**
 * Invitation form data
 */
export interface InvitationFormData {
  email: string;
  name: string;
  role: 'HR_ADMIN' | 'EMPLOYEE';
  department?: string;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation rule configuration
 */
export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string | number) => string | null;
}

/**
 * Form field validation result
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Generic pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Filter parameters for employee list
 */
export interface EmployeeFilterParams {
  department?: string;
  status?: 'Active' | 'On Leave' | 'Terminated';
  search?: string;
}
