import React from 'react';

export type UserRole = 'HR_ADMIN' | 'EMPLOYEE';

// Department type for strict type checking
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

export interface User {
  id: string;
  employeeId?: string;
  email?: string;
  name: string;
  role: UserRole;
  avatar: string;
  jobTitle: string;
  bio?: string;
  phone?: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  avatar: string;
  status: 'Active' | 'On Leave' | 'Terminated';
  onboardingStatus: 'Not Started' | 'In Progress' | 'Completed';
  joinDate: string;
  location: string;
  skills: string[];
  // New fields for ESS
  bio?: string;
  phone?: string;
  slack?: string;
  emergencyContact?: string;
  managerId?: string;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  color: 'primary' | 'green' | 'orange' | 'red' | 'teal';
}

export interface DocumentItem {
  id: string;
  name: string;
  type: string;
  category: string;
  size: string;
  owner: string;
  employeeId?: string;
  lastAccessed: string;
  status: 'Active' | 'Deleted';
  deletedAt?: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  value2?: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  dates: string; // Display string like "Jan 15 - Jan 18"
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  reason?: string;
  days: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  avatar: string;
}

export interface LeaveBalance {
  type: string;
  total: number;
  used: number;
  remaining: number;
}

export interface ComplianceItem {
  id: string;
  title: string;
  status: 'Complete' | 'In Progress' | 'Overdue';
}

export interface AuditLogItem {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  type: 'user' | 'leave' | 'policy';
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  type: 'announcement' | 'policy' | 'event';
  date?: string;
  author?: string;
  createdAt?: string;
}

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  stage: 'Pre-boarding' | 'Week 1' | 'Month 1';
  assignee: string;
  dueDate: string;
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
  link?: string; // Link to materials
}

export interface TrainingModule {
  id: string;
  title: string;
  duration: string;
  type: 'Video' | 'Quiz' | 'Reading';
  status: 'Locked' | 'In Progress' | 'Completed';
  progress: number;
  thumbnail: string;
}

export interface OnboardingProgressSummary {
  id: string;
  name: string;
  role: string;
  progress: number;
  avatar?: string;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  type: 'Birthday' | 'Meeting' | 'Social';
  avatar?: string;
  color?: string;
}

export interface KeyContact {
  id: string;
  name: string;
  role: string;
  relation: string;
  email: string;
  avatar: string;
}

export interface JobHistoryItem {
  id: string;
  role: string;
  department: string;
  startDate: string;
  endDate: string; // 'Present' if current
  description: string;
}

export interface EmployeeTrainingRecord {
  id: string;
  employeeId: string;
  title: string;
  duration: string;
  status: 'Completed' | 'In Progress' | 'Not Started';
  completionDate?: string;
  score?: number;
}

export interface OrgNode {
  id: string;
  parentId: string | null;
  name: string;
  role: string;
  avatar: string;
  department?: Department;
  email?: string;
  status?: 'Active' | 'On Leave' | 'Terminated';
  directReportCount?: number;
  children?: OrgNode[]; // Helper for recursive rendering
}

export interface MyTeamHierarchy {
  manager: TeamMember | null;
  peers: TeamMember[];
  directReports: TeamMember[];
  stats: {
    totalDirectReports: number;
    peersCount: number;
    departmentsInTeam: number;
  };
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string | null;
  status: string;
  department: string;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  date: string;
  reviewer: string;
  rating: number; // 1 to 5
  notes: string;
}

// ============================================================================
// API & Network Types
// ============================================================================

/**
 * Authentication credentials for login
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Backend user structure (as returned by API)
 * Different from frontend User type - needs mapping
 */
export interface BackendUser {
  userId: string;
  employeeId: string;
  email: string;
  name: string;
  role: 'HR_ADMIN' | 'EMPLOYEE';
  avatar?: string;
  jobTitle?: string;
  department?: string;
  bio?: string;
  phone?: string;
}

/**
 * Authentication response from login endpoint
 */
export interface AuthResponse {
  token: string;
  user: BackendUser;
}

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
  role: UserRole;
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
  status?: Employee['status'];
  search?: string;
}