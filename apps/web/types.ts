import React from 'react';

export type UserRole = 'HR_ADMIN' | 'EMPLOYEE' | 'MANAGER' | 'FINANCE';

// Availability Status Types
export type AvailabilityStatus = 'online' | 'busy' | 'away' | 'offline';

export interface UserStatusInfo {
  employeeId: string;
  status: AvailabilityStatus;
  statusMessage?: string;
  updatedAt: string;
}

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

// Job title type for strict type checking
export const JOB_TITLES = [
  'Software Engineer',
  'Senior Software Engineer',
  'Full-stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'Full-stack Developer Intern',
  'UI/UX Designer',
  'Graphic Designer',
  'Product Manager',
  'Project Manager',
  'QA Engineer',
  'DevOps Engineer',
  'Data Analyst',
  'Data Scientist',
  'Marketing Specialist',
  'Sales Representative',
  'HR Specialist',
  'HR Manager',
  'Finance Analyst',
  'Customer Support Specialist',
  'Team Lead',
  'Engineering Manager',
  'Intern',
] as const;

export type JobTitle = (typeof JOB_TITLES)[number];

export interface User {
  id: string;
  userId?: string;      // users-table UUID (used for reviewer_user_id comparison)
  employeeId?: string;
  email?: string;
  name: string;
  role: UserRole;
  avatar: string;
  jobTitle: string;
  bio?: string;
  phone?: string;
  emailNotifications?: boolean;
}

export interface EmployeeAddress {
  addressLine1?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
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
  birthDate?: string;
  location: string;
  skills: string[];
  // New fields for ESS
  bio?: string;
  phone?: string;
  slack?: string;
  emergencyContact?: string;
  salary?: number;
  managerId?: string;
  employeeCode?: string;
  address?: EmployeeAddress | null;
  bannerColor?: string;
  workType?: 'office' | 'remote' | 'hybrid';
}

export interface StatCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  color: 'primary' | 'green' | 'orange' | 'red' | 'teal';
  invertTrend?: boolean;
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
  status: 'Pending' | 'Manager Approved' | 'Approved' | 'Rejected' | 'Cancel Requested';
  avatar: string;
  handoverEmployeeId?: string;
  handoverEmployeeName?: string;
  handoverNotes?: string;
  medicalCertificatePath?: string;
  rejectionReason?: string;
  approverEmployeeId?: string;
  updatedAt?: string;
  isHalfDay?: boolean;
  halfDayPeriod?: 'morning' | 'afternoon';
}

export interface LeaveBalance {
  type: string;
  total: number;
  used: number;
  remaining: number;
  isOverride?: boolean;
}

export interface EffectiveLeaveQuota {
  type: string;
  total: number;
  isOverride: boolean;
  defaultTotal: number;
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
  employeeId?: string | null;
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
  description?: string;
  duration: string;
  type: 'Video' | 'Quiz' | 'Reading';
  status: 'Locked' | 'In Progress' | 'Completed';
  progress: number;
  thumbnail: string;
  isActive?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
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
  type: 'Birthday' | 'Meeting' | 'Social' | 'Training' | 'Holiday' | 'Deadline' | 'Company Event';
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

export interface OnboardingDocument {
  id: string;
  employeeId: string;
  name: string;
  description: string;
  status: 'Pending' | 'Uploaded' | 'Approved' | 'Rejected';
  filePath: string | null;
  fileType: string | null;
  fileSize: string | null;
  uploadedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}

export interface JobHistoryItem {
  id: string;
  role: string;
  department: string;
  startDate: string;
  endDate: string; // 'Present' if current
  description: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface EmployeeTrainingRecord {
  id: string;
  employeeId: string;
  title: string;
  duration: string;
  status: 'Completed' | 'In Progress' | 'Not Started';
  completionDate?: string;
  score?: number;
  dueDate?: string;
  assignedBy?: string;
  assignedAt?: string;
  type?: string;
  thumbnail?: string;
  moduleProgress?: number;
}

export interface TrainingAnalytics {
  totalModules: number;
  activeModules: number;
  totalAssignments: number;
  completionRate: number;
  overdueCount: number;
  completionsByDepartment: Array<{ department: string; total: number; completed: number; rate: number }>;
  completionsByModule: Array<{ moduleId: string; title: string; total: number; completed: number; rate: number }>;
}

export interface ComplianceItem {
  id: string;
  title: string;
  description: string | null;
  category: 'ISO' | 'PDPA' | 'Custom';
  status: 'Draft' | 'Active' | 'In Progress' | 'Completed' | 'Overdue';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedTo: string | null;
  assignedToName?: string | null;
  assignedDepartment: string | null;
  dueDate: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceEvidence {
  id: string;
  complianceItemId: string;
  filePath: string;
  fileName: string;
  fileSize: number | null;
  uploadedBy: string | null;
  createdAt: string;
}

export interface ComplianceStatusHistory {
  id: string;
  complianceItemId: string;
  oldStatus: string | null;
  newStatus: string;
  changedBy: string | null;
  changedByEmail?: string | null;
  reason: string | null;
  createdAt: string;
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
  employeeName?: string;
  employeeAvatar?: string;
  date: string;
  reviewer: string;
  reviewerUserId?: string;
  rating: number | null;
  notes: string;
  status: 'draft' | 'submitted' | 'manager_reviewed' | 'completed' | 'rejected';
  selfReview?: string | null;
  managerComment?: string | null;
  hrComment?: string | null;
  reviewPeriod?: string | null;
  managerReviewedBy?: string | null;
  managerReviewedAt?: string | null;
  hrReviewedBy?: string | null;
  hrReviewedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalendarEvent {
  id: string;
  eventType: 'leave' | 'wfh' | 'ot' | 'holiday';
  employeeId: string | null;
  employeeName: string;
  avatar: string | null;
  department: string | null;
  startDate: string;
  endDate: string;
  subType: string;
  status: string;
  reason: string | null;
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
  rememberMe?: boolean;
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
  role: 'HR_ADMIN' | 'EMPLOYEE' | 'MANAGER' | 'FINANCE';
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
  token: string;           // backward compat alias = accessToken
  accessToken: string;
  refreshToken: string;
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
  birthDate?: string;
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

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationType = 'info' | 'success' | 'warning' | 'leave' | 'employee' | 'document' | 'system';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  time: string;
  created_at: string;
}

// ============================================================================
// Admin Attendance Types
// ============================================================================

export type AttendanceStatus = 'On-time' | 'Late' | 'Absent' | 'On-leave';

export type AdminDisplayStatus = 'Active' | 'Checked Out' | 'On-Leave' | 'Not In';

export interface AdminAttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breakDuration: number;
  totalHours: number | null;
  status: AttendanceStatus;
  displayStatus?: AdminDisplayStatus;
  notes: string | null;
  modifiedBy: string | null;
  createdAt: string;
  employeeName: string;
  employeeDepartment: string;
  employeeAvatar: string | null;
  autoCheckout: boolean;
  earlyDeparture: boolean;
  overtimeHours: number | null;
  checkInType?: string;
}

export interface AttendanceSnapshot {
  present: number;
  late: number;
  absent: number;
  onLeave: number;
  total: number;
}

export interface AdminAttendanceSnapshotV2 {
  total: number;
  presentToday: number;
  activeNow: number;
  checkedOut: number;
  absentOrLeave: number;
  onLeave: number;
}

export interface AttendanceAnalytics {
  dailyRate: { date: string; present: number; total: number; rate: number; late: number }[];
  topLate: { employeeId: string; name: string; avatar: string | null; lateCount: number }[];
}

export interface AdminAttendanceUpsertData {
  employeeId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status?: AttendanceStatus;
  notes?: string;
}

// ============================================================================
// Survey & Sentiment Types
// ============================================================================

export type SurveyCategory =
  | 'Workload' | 'Team' | 'Growth' | 'Work-Life Balance' | 'Management'
  | 'Communication' | 'Teamwork' | 'Problem Solving' | 'Time Management'
  | 'Adaptability' | 'Technical Skills' | 'Innovation & Learning' | 'Quality & Responsibility'
  | 'Blueprint' | 'Action' | 'Nurturing' | 'Knowledge';

export const SURVEY_CATEGORIES: SurveyCategory[] = [
  'Workload', 'Team', 'Growth', 'Work-Life Balance', 'Management',
  'Communication', 'Teamwork', 'Problem Solving', 'Time Management',
  'Adaptability', 'Technical Skills', 'Innovation & Learning', 'Quality & Responsibility',
  'Blueprint', 'Action', 'Nurturing', 'Knowledge',
];

export interface SurveyQuestion {
  id: string;
  questionText: string;
  category: SurveyCategory;
  sortOrder: number;
}

export interface SurveyListItem {
  id: string;
  title: string;
  status: 'active' | 'closed';
  allowRetake: boolean;
  createdAt: string;
  closedAt: string | null;
  questionCount: number;
  responseCount: number;
  hasCompleted: boolean;
}

export interface SurveyDetail {
  id: string;
  title: string;
  status: 'active' | 'closed';
  allowRetake: boolean;
  createdAt: string;
  closedAt: string | null;
  questions: SurveyQuestion[];
  hasCompleted: boolean;
}

export interface CategoryScore {
  category: string;
  score: number;
  responseCount: number;
}

export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
}

export interface SentimentOverview {
  overallScore: number;
  responseRate: number;
  totalResponses: number;
  totalEmployees: number;
  categoryBreakdown: CategoryScore[];
  distribution: SentimentDistribution;
}

export interface AdminAttendanceFilters {
  search?: string;
  department?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Asset Types
// ============================================================================

export type AssetStatus = 'Available' | 'Assigned' | 'Under Maintenance' | 'Retired';

export interface CompanyAsset {
  id: string;
  name: string;
  assetType: string;
  serialNumber?: string | null;
  status: AssetStatus;
  assignedTo?: string | null;
  assignedToName?: string | null;
  assignedToDepartment?: string | null;
  assignedAt?: string | null;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// System Config Types
// ============================================================================

// ============================================================================
// Expense Claim Types
// ============================================================================

export type ExpenseClaimStatus = 'Pending' | 'Approved' | 'Rejected' | 'Reimbursed' | 'Cancelled';

export const EXPENSE_CATEGORIES = [
  'Travel', 'Meals', 'Equipment', 'Office Supplies', 'Training', 'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface ExpenseClaim {
  id: string;
  employeeId: string;
  employeeName: string;
  avatar: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  expenseDate: string;
  description?: string;
  receiptPath?: string;
  status: ExpenseClaimStatus;
  rejectionReason?: string;
  approverEmployeeId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseSummary {
  totalReimbursed: number;
  pendingAmount: number;
  pendingCount: number;
  thisMonthCount: number;
}

export interface AdminExpenseSummary {
  pendingCount: number;
  pendingAmount: number;
  monthReimbursed: number;
}

export interface LeaveQuotaConfig {
  type: string;
  total: number;
  color?: string; // palette key: "blue", "amber", etc.
}

export interface PublicHoliday {
  id: string;
  date: string;
  endDate: string | null;
  name: string;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
}