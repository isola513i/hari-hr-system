import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import type { ComplianceItem, PaginatedResponse } from '../../types';

export interface ComplianceCheck {
  id: string;
  titleKey: string;
  status: 'Complete' | 'In Progress' | 'Overdue';
  detail: string;
  percentage: number;
}

export interface PersistentAuditLog {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resource: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string | null;
  statusCode: number;
  duration: number | null;
  success: boolean;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export const useComplianceChecks = () => {
  return useQuery({
    queryKey: queryKeys.compliance.checks(),
    queryFn: () => api.get<ComplianceCheck[]>('/compliance/checks'),
  });
};

export const useComplianceItems = (filters: { status?: string; category?: string; priority?: string; page?: number; limit?: number } = {}) => {
  return useQuery({
    queryKey: queryKeys.compliance.items(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.category) params.set('category', filters.category);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      return api.get<{ data: ComplianceItem[]; total: number; page: number; totalPages: number }>(`/compliance/items?${params}`);
    },
  });
};

export const useCreateComplianceItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ComplianceItem>) =>
      api.post<ComplianceItem>('/compliance/items', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.compliance.all });
    },
  });
};

export const useUpdateComplianceItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ComplianceItem> }) =>
      api.put<ComplianceItem>(`/compliance/items/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.compliance.all });
    },
  });
};

export const useDeleteComplianceItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/compliance/items/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.compliance.all });
    },
  });
};

export const useUpdateComplianceStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      api.patch<ComplianceItem>(`/compliance/items/${id}/status`, { status, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.compliance.all });
    },
  });
};

export const useComplianceAuditLogs = (filters: { page?: number; limit?: number; resource?: string } = {}) => {
  return useQuery({
    queryKey: queryKeys.compliance.auditLogs(filters as Record<string, unknown>),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', (filters.limit || 15).toString());
      if (filters.resource && filters.resource !== 'All') params.append('resource', filters.resource);
      const qs = params.toString();
      return api.get<PaginatedResponse<PersistentAuditLog>>(
        qs ? `/compliance/audit-logs?${qs}` : '/compliance/audit-logs'
      );
    },
  });
};
