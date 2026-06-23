import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface RegularizationRequest {
  id: string;
  employeeId: string;
  date: string;
  requestedClockIn: string | null;
  requestedClockOut: string | null;
  reason: string;
  status: 'pending' | 'manager_approved' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  managerReviewedBy: string | null;
  managerReviewedAt: string | null;
  notes: string | null;
  createdAt: string;
  employeeName?: string;
  employeeDepartment?: string;
  employeeAvatar?: string | null;
}

const KEY = ['attendance-regularization'];

export const useMyRegularizationRequests = (filters?: { status?: string }) => {
  const qs = filters && Object.keys(filters).length > 0
    ? '?' + new URLSearchParams(filters as Record<string, string>).toString()
    : '';
  return useQuery({
    queryKey: [...KEY, 'my', filters],
    queryFn: () => api.get<RegularizationRequest[]>(`/attendance-regularization/my${qs}`),
  });
};

export const useAllRegularizationRequests = (filters?: { status?: string; date?: string } | false) => {
  const enabled = filters !== false;
  const f = enabled ? filters : undefined;
  const qs = f && Object.keys(f).length > 0
    ? '?' + new URLSearchParams(f as Record<string, string>).toString()
    : '';
  return useQuery({
    queryKey: [...KEY, 'admin', f],
    queryFn: () => api.get<RegularizationRequest[]>(`/attendance-regularization/admin${qs}`),
    enabled,
  });
};

export const useCreateRegularizationRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; requestedClockIn?: string; requestedClockOut?: string; reason: string }) =>
      api.post('/attendance-regularization', data as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
};

export const useManagerApproveRegularization = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put(`/attendance-regularization/${id}/manager-approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
};

export const useApproveRegularization = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      api.put(`/attendance-regularization/${id}/approve`, { notes } as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
};

export const useRejectRegularization = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      api.put(`/attendance-regularization/${id}/reject`, { notes } as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
};

export const useCancelRegularization = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/attendance-regularization/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
};
