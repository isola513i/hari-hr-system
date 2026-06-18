/**
 * Single source of truth for leave types.
 *
 * Previously the canonical list lived in the express-validator rule
 * (middlewares/security.ts) while LeaveRequestService re-declared a couple of
 * the same strings as local constants — so adding or renaming a leave type
 * meant editing several files in lock-step. Import from here instead.
 */
export const LEAVE_TYPES = [
  'Vacation',
  'Sick Leave',
  'Personal Day',
  'Maternity Leave',
  'Compensatory Leave',
  'Military Leave',
  'Leave Without Pay',
] as const;

export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_TYPE_VACATION: LeaveType = 'Vacation';
export const LEAVE_TYPE_SICK: LeaveType = 'Sick Leave';
export const LEAVE_TYPE_PERSONAL: LeaveType = 'Personal Day';
export const LEAVE_TYPE_MATERNITY: LeaveType = 'Maternity Leave';
export const LEAVE_TYPE_COMPENSATORY: LeaveType = 'Compensatory Leave';
export const LEAVE_TYPE_MILITARY: LeaveType = 'Military Leave';
export const LEAVE_TYPE_UNPAID: LeaveType = 'Leave Without Pay';
