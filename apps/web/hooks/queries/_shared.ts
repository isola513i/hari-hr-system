import { API_HOST } from '../../lib/api';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export function transformAvatarUrl<T extends { avatar?: string | null }>(item: T): T {
  return {
    ...item,
    avatar: item.avatar && item.avatar.startsWith('/')
      ? `${API_HOST}${item.avatar}`
      : item.avatar,
  };
}

// ---------------------------------------------------------------------------
// Shared interfaces used by multiple domains
// ---------------------------------------------------------------------------

export interface EmployeeListFilters {
  [key: string]: unknown;
  page?: number;
  limit?: number;
  department?: string;
  status?: string;
  search?: string;
}

export interface DocumentListFilters {
  [key: string]: unknown;
  page?: number;
  limit?: number;
  category?: string;
  type?: string;
  search?: string;
}
