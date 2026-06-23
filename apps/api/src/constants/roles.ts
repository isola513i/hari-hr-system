/**
 * Re-export shared role/status definitions from @hari/shared-types so backend
 * code has a single import path and stays in sync with the web app. Migrate
 * existing inline unions (e.g. in models) to these incrementally.
 */
export { USER_ROLES, LEAVE_REQUEST_STATUSES } from '@hari/shared-types';
export type {
  UserRole,
  LeaveRequestStatus,
  AttendanceStatus,
  ExpenseClaimStatus,
  AvailabilityStatus,
} from '@hari/shared-types';
