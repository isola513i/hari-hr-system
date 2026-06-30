import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import type { AuditLogItem, UpcomingEvent, PublicHoliday, PaginatedResponse } from '../../types';
import { transformAvatarUrl } from './_shared';
import { expandHolidayDates } from '../../lib/holidays';
import type { PersistentAuditLog } from './compliance';

export const useAuditLogs = () => {
  return useQuery({
    queryKey: queryKeys.auditLogs.list(),
    queryFn: () => api.get<AuditLogItem[]>('/audit-logs'),
  });
};

export const useAuditLogsFull = (filters: {
  page?: number;
  limit?: number;
  resource?: string;
  action?: string;
  userEmail?: string;
  startDate?: string;
  endDate?: string;
  success?: string;
} = {}) => {
  return useQuery({
    queryKey: queryKeys.compliance.auditLogs(filters as Record<string, unknown>),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page.toString());
      params.append('limit', (filters.limit || 15).toString());
      if (filters.resource && filters.resource !== 'All') params.append('resource', filters.resource);
      if (filters.action) params.append('action', filters.action);
      if (filters.userEmail) params.append('userEmail', filters.userEmail);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.success && filters.success !== 'All') params.append('success', filters.success === 'Success' ? 'true' : 'false');
      return api.get<PaginatedResponse<PersistentAuditLog>>(`/compliance/audit-logs?${params.toString()}`);
    },
  });
};

export const useUpcomingEvents = () => {
  return useQuery({
    queryKey: queryKeys.events.list(),
    queryFn: async () => {
      const data = await api.get<UpcomingEvent[]>('/upcoming-events');
      return data.map((e): UpcomingEvent => transformAvatarUrl(e));
    },
  });
};

export const useHolidays = () => {
  return useQuery({
    queryKey: queryKeys.holidays.list(),
    queryFn: () => api.get<PublicHoliday[]>('/holidays'),
  });
};

/**
 * Returns a Set of "YYYY-MM-DD" holiday strings (recurring + multi-day expanded)
 * for use with `<DatePicker disabledDates={...} />` to block holiday selection.
 * Covers `yearsAround` years on each side of the current year.
 */
export const useHolidayDateSet = (yearsAround = 1): Set<string> => {
  const { data: holidays } = useHolidays();
  return useMemo(() => {
    const thisYear = new Date().getFullYear();
    return expandHolidayDates(holidays, thisYear - yearsAround, thisYear + yearsAround);
  }, [holidays, yearsAround]);
};

export const useBulkCreateHolidays = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (holidays: { date: string; endDate?: string | null; name: string; isRecurring?: boolean }[]) =>
      api.post<{ created: number; failed: number }>('/holidays/bulk', { holidays }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.holidays.all });
    },
  });
};

export const useCreateHoliday = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; endDate?: string | null; name: string; isRecurring?: boolean }) =>
      api.post<PublicHoliday>('/holidays', data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.holidays.all });
    },
  });
};

export const useUpdateHoliday = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; date?: string; endDate?: string | null; name?: string; isRecurring?: boolean }) =>
      api.put<PublicHoliday>(`/holidays/${id}`, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.holidays.all });
    },
  });
};

export const useDeleteHoliday = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/holidays/${id}`),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.holidays.all });
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/change-password', data),
  });
};
