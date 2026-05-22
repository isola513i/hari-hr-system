import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';

export const useMyWFHRequests = () =>
  useQuery({
    queryKey: queryKeys.wfhRequests.my(),
    queryFn: () => api.get<unknown[]>('/wfh-requests/my'),
  });

export const useAdminWFHRequests = (filters?: { status?: string; date?: string } | false) => {
  const enabled = filters !== false;
  const f = enabled ? (filters as Record<string, unknown>) : undefined;
  const qs = f && Object.keys(f).length > 0
    ? '?' + new URLSearchParams(f as Record<string, string>).toString()
    : '';
  return useQuery({
    queryKey: queryKeys.wfhRequests.admin(f),
    queryFn: () => api.get<unknown[]>(`/wfh-requests/admin${qs}`),
    enabled,
  });
};

export const useCreateWFHRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; reason?: string }) => api.post('/wfh-requests', data as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wfhRequests.all });
    },
  });
};

export const useApproveWFH = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put(`/wfh-requests/${id}/approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wfhRequests.all });
    },
  });
};

export const useRejectWFH = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put(`/wfh-requests/${id}/reject`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wfhRequests.all });
    },
  });
};

export const useManagerApproveWFH = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put(`/wfh-requests/${id}/manager-approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wfhRequests.all });
    },
  });
};
