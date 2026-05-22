import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface OTRequest {
  id: string;
  employeeId: string;
  date: string;
  plannedStart: string;
  plannedEnd: string;
  plannedHours: number;
  actualHours: number | null;
  otType: 'regular' | 'holiday';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  employeeName?: string;
  employeeAvatar?: string;
  department?: string;
  reviewerName?: string;
}

export const useMyOTRequests = (filters?: { status?: string; month?: string }) => {
  const qs = filters && Object.keys(filters).length > 0
    ? '?' + new URLSearchParams(filters as Record<string, string>).toString()
    : '';
  return useQuery({
    queryKey: ['ot-requests', 'my', filters],
    queryFn: () => api.get<OTRequest[]>(`/ot-requests/my${qs}`),
  });
};

export const useAllOTRequests = (filters?: { status?: string; employeeName?: string; month?: string; department?: string } | false) => {
  const enabled = filters !== false;
  const f = enabled ? filters : undefined;
  const qs = f && Object.keys(f).length > 0
    ? '?' + new URLSearchParams(f as Record<string, string>).toString()
    : '';
  return useQuery({
    queryKey: ['ot-requests', 'admin', f],
    queryFn: () => api.get<OTRequest[]>(`/ot-requests${qs}`),
    enabled,
  });
};

export const useOTStats = () =>
  useQuery({
    queryKey: ['ot-requests', 'stats'],
    queryFn: () => api.get<{ pending: number; approvedThisMonth: number; totalOTHoursThisMonth: number; topEmployees: { employeeId: string; name: string; hours: number }[] }>('/ot-requests/stats'),
  });

export const useCreateOTRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; plannedStart: string; plannedEnd: string; plannedHours: number; otType?: string; reason: string }) =>
      api.post('/ot-requests', data as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ot-requests'] });
    },
  });
};

export const useApproveOT = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      api.put(`/ot-requests/${id}/approve`, { notes } as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ot-requests'] });
    },
  });
};

export const useRejectOT = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      api.put(`/ot-requests/${id}/reject`, { notes } as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ot-requests'] });
    },
  });
};

export const useCancelOTRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/ot-requests/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ot-requests'] });
    },
  });
};
