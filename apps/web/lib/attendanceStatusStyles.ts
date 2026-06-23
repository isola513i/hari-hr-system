import type { AdminDisplayStatus } from '../types';

/**
 * Returns Tailwind CSS classes for the admin attendance display status dot and badge.
 * Shared across AdminAttendance and any other admin views that show the same status set.
 */
export function getStatusStyle(status: AdminDisplayStatus | string): { dot: string; badge: string } {
  switch (status) {
    case 'Active':
      return { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-800' };
    case 'Checked Out':
      return { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-800' };
    case 'On-Leave':
      return { dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:ring-purple-800' };
    case 'Not In':
      return { dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:ring-orange-800' };
    default:
      return { dot: 'bg-gray-500', badge: 'bg-gray-50 text-gray-700 ring-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:ring-gray-800' };
  }
}
