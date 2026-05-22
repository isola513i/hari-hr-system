import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, BASE_URL, getAuthToken } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import { transformAvatarUrl } from './_shared';

export const useExpenseClaims = () => {
  return useQuery({
    queryKey: queryKeys.expenseClaims.list(),
    queryFn: () => api.get<import('../../types').ExpenseClaim[]>('/expense-claims'),
    select: (data) => data.map(transformAvatarUrl),
  });
};

export const useExpenseSummary = (employeeId?: string) => {
  return useQuery({
    queryKey: queryKeys.expenseClaims.summary(employeeId || ''),
    queryFn: () => api.get<import('../../types').ExpenseSummary>(`/expense-claims/summary/${employeeId}`),
    enabled: !!employeeId,
  });
};

export const useAdminExpenseSummary = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.expenseClaims.adminSummary(),
    queryFn: () => api.get<import('../../types').AdminExpenseSummary>('/expense-claims/admin/summary'),
    enabled,
  });
};

export const useCreateExpenseClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const token = getAuthToken();
      const res = await fetch(`${BASE_URL}/expense-claims`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create expense claim');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenseClaims.all });
    },
  });
};

export const useUpdateExpenseClaimStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; status: string; rejectionReason?: string }) => {
      return api.patch(`/expense-claims/${id}`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenseClaims.all });
    },
  });
};

export const useCancelExpenseClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/expense-claims/${id}/cancel`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenseClaims.all });
    },
  });
};

export const useDeleteExpenseClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/expense-claims/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenseClaims.all });
    },
  });
};

export const useManagerExpenseQueue = () => {
  return useQuery({
    queryKey: queryKeys.expenseClaims.managerQueue(),
    queryFn: () => api.get<any[]>('/expense-claims/manager-queue'),
    staleTime: 30000,
  });
};

export const useManagerApproveExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/expense-claims/${id}/manager-approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenseClaims.all });
    },
  });
};
