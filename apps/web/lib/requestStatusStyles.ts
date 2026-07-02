/**
 * Shared pill styles for request statuses across the Requests flow
 * (leave / OT / WFH / attendance-regularization / expense).
 *
 * Single source of truth so the tabs — which are compared side by side — can't
 * drift. Classes match the existing convention already used by every request tab.
 */
const REQUEST_STATUS_PILL: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  manager_approved: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  reimbursed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

const DEFAULT_PILL = REQUEST_STATUS_PILL.cancelled;

/** Tailwind classes for a request status pill. Case-insensitive (handles 'Pending'/'pending'). */
export function getRequestStatusPill(status: string | null | undefined): string {
  return REQUEST_STATUS_PILL[(status ?? '').toLowerCase()] ?? DEFAULT_PILL;
}
