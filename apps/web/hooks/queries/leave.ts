import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, BASE_URL, getAuthToken } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import type { LeaveRequest, LeaveBalance, LeaveQuotaConfig, EffectiveLeaveQuota } from '../../types';
import { transformAvatarUrl } from './_shared';

export const useLeaveRequests = () => {
  return useQuery({
    queryKey: queryKeys.leaveRequests.list(),
    queryFn: async () => {
      const data = await api.get<LeaveRequest[]>('/leave-requests');
      return data.map(transformAvatarUrl);
    },
  });
};

export const useLeaveBalance = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.leaveBalances.byEmployee(employeeId!),
    queryFn: () => api.get<LeaveBalance[]>(`/leave-balances/${employeeId}`),
    enabled: !!employeeId,
  });
};

export const useAddLeaveRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/leave-requests', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
      qc.invalidateQueries({ queryKey: queryKeys.leaveBalances.all });
    },
  });
};

export const useAddLeaveRequestWithFile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const token = getAuthToken();
      const response = await fetch(`${BASE_URL}/leave-requests`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Failed to submit leave request');
      }
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
      qc.invalidateQueries({ queryKey: queryKeys.leaveBalances.all });
    },
  });
};

export const useUpdateLeaveStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, rejectionReason }: { id: string; status: 'Approved' | 'Rejected'; rejectionReason?: string }) =>
      api.patch(`/leave-requests/${id}`, { status, rejectionReason }),
    onMutate: async ({ id, status, rejectionReason }) => {
      await qc.cancelQueries({ queryKey: queryKeys.leaveRequests.list() });
      const previous = qc.getQueryData<LeaveRequest[]>(queryKeys.leaveRequests.list());

      qc.setQueryData<LeaveRequest[]>(queryKeys.leaveRequests.list(), (old) => {
        if (!old) return old;
        return old.map((r) =>
          r.id === id ? { ...r, status: status as LeaveRequest['status'], rejectionReason } : r,
        );
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.leaveRequests.list(), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
      qc.invalidateQueries({ queryKey: queryKeys.leaveBalances.all });
    },
  });
};

export const useCancelLeaveRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ action: 'deleted' | 'cancel_requested' }>(`/leave-requests/${id}/cancel`, {}),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.leaveRequests.list() });
      const previous = qc.getQueryData<LeaveRequest[]>(queryKeys.leaveRequests.list());

      qc.setQueryData<LeaveRequest[]>(queryKeys.leaveRequests.list(), (old) => {
        if (!old) return old;
        return old.flatMap((r) => {
          if (r.id !== id) return [r];
          if (r.status === 'Pending') return [];
          return [{ ...r, status: 'Cancel Requested' as LeaveRequest['status'] }];
        });
      });

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.leaveRequests.list(), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
      qc.invalidateQueries({ queryKey: queryKeys.leaveBalances.all });
    },
  });
};

export const useEditLeaveRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: FormData }) => {
      const token = getAuthToken();
      const response = await fetch(`${BASE_URL}/leave-requests/${id}`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Failed to edit leave request');
      }
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.leaveRequests.all }),
        qc.invalidateQueries({ queryKey: queryKeys.leaveBalances.all }),
      ]);
    },
  });
};

export const useHandleCancelDecision = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approve_cancel' | 'reject_cancel' }) =>
      api.post(`/leave-requests/${id}/cancel-decision`, { decision }),
    onMutate: async ({ id, decision }) => {
      await qc.cancelQueries({ queryKey: queryKeys.leaveRequests.list() });
      const previous = qc.getQueryData<LeaveRequest[]>(queryKeys.leaveRequests.list());

      qc.setQueryData<LeaveRequest[]>(queryKeys.leaveRequests.list(), (old) => {
        if (!old) return old;
        if (decision === 'approve_cancel') {
          return old.filter((r) => r.id !== id);
        }
        return old.map((r) =>
          r.id === id ? { ...r, status: 'Approved' as LeaveRequest['status'] } : r,
        );
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.leaveRequests.list(), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
      qc.invalidateQueries({ queryKey: queryKeys.leaveBalances.all });
    },
  });
};

export const useLeaveRequestById = (id: string | undefined) => {
  const { data: allRequests = [] } = useLeaveRequests();
  const request = id ? allRequests.find((r) => r.id === id) : undefined;
  return { data: request, isPending: false };
};

export const useLeaveTypeConfig = () => {
  const DEFAULT_LEAVE_TYPE_CONFIGS: LeaveQuotaConfig[] = [
    { type: 'Vacation', total: 7, color: 'blue' },
    { type: 'Sick Leave', total: 30, color: 'amber' },
    { type: 'Personal Day', total: 6, color: 'violet' },
    { type: 'Leave Without Pay', total: -1, color: 'orange' },
  ];

  return useQuery({
    queryKey: queryKeys.systemConfig.leaveQuotas(),
    queryFn: async () => {
      try {
        const data = await api.get<{ key: string; value: string }>('/configs/leave/quotas');
        const parsed: LeaveQuotaConfig[] = JSON.parse(data.value);
        return parsed;
      } catch (err) {
        console.warn('[useLeaveTypeConfig] Failed to fetch leave type configs, using defaults:', err);
        return DEFAULT_LEAVE_TYPE_CONFIGS;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateLeaveTypeConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (configs: LeaveQuotaConfig[]) =>
      api.put('/configs/leave/quotas', { value: JSON.stringify(configs) } as unknown as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.systemConfig.leaveQuotas() });
      qc.invalidateQueries({ queryKey: queryKeys.leaveBalances.all });
    },
  });
};

export const useEmployeeLeaveQuotas = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.leaveQuotas.byEmployee(employeeId!),
    queryFn: () => api.get<EffectiveLeaveQuota[]>(`/employees/${employeeId}/leave-quotas`),
    enabled: !!employeeId,
  });
};

export const useUpdateEmployeeLeaveQuotas = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, overrides }: { employeeId: string; overrides: Array<{ leaveType: string; total: number }> }) =>
      api.put<EffectiveLeaveQuota[]>(`/employees/${employeeId}/leave-quotas`, { overrides } as unknown as Record<string, unknown>),
    onSuccess: (_data, { employeeId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.leaveQuotas.byEmployee(employeeId) });
      qc.invalidateQueries({ queryKey: queryKeys.leaveBalances.all });
    },
  });
};

export const useDeleteLeaveQuotaOverride = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, leaveType }: { employeeId: string; leaveType: string }) =>
      api.delete<EffectiveLeaveQuota[]>(`/employees/${employeeId}/leave-quotas/${encodeURIComponent(leaveType)}`),
    onSuccess: (_data, { employeeId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.leaveQuotas.byEmployee(employeeId) });
      qc.invalidateQueries({ queryKey: queryKeys.leaveBalances.all });
    },
  });
};
