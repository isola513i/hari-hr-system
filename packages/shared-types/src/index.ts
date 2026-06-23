/**
 * @hari/shared-types
 *
 * Single source of truth for domain types/constants that are otherwise
 * duplicated between the API (apps/api) and the web app (apps/web). This is the
 * foundational seed — migrate further shared definitions here incrementally so
 * the two apps stop drifting apart.
 */

// ── Roles ────────────────────────────────────────────────────────────────────
export type UserRole = 'HR_ADMIN' | 'EMPLOYEE' | 'MANAGER' | 'FINANCE';

export const USER_ROLES: readonly UserRole[] = [
  'HR_ADMIN',
  'MANAGER',
  'FINANCE',
  'EMPLOYEE',
];

// ── Presence / availability ──────────────────────────────────────────────────
export type AvailabilityStatus = 'online' | 'busy' | 'away' | 'offline';

// ── Attendance ───────────────────────────────────────────────────────────────
export type AttendanceStatus = 'On-time' | 'Late' | 'Absent' | 'On-leave';

// ── Leave requests ───────────────────────────────────────────────────────────
export type LeaveRequestStatus =
  | 'Pending'
  | 'Manager Approved'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'Cancel Requested';

export const LEAVE_REQUEST_STATUSES: readonly LeaveRequestStatus[] = [
  'Pending',
  'Manager Approved',
  'Approved',
  'Rejected',
  'Cancelled',
  'Cancel Requested',
];

// ── Expense claims ───────────────────────────────────────────────────────────
export type ExpenseClaimStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Reimbursed'
  | 'Cancelled';
