import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import type { CompanyAsset } from '../../types';

export const useAssets = (filters?: { status?: string; search?: string }) => {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString();
  return useQuery({
    queryKey: queryKeys.assets.list(filters as Record<string, unknown>),
    queryFn: () => api.get<CompanyAsset[]>(`/assets${qs ? `?${qs}` : ''}`),
  });
};

export const useCreateAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CompanyAsset>) => api.post<CompanyAsset>('/assets', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.assets.all }); },
  });
};

export const useUpdateAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CompanyAsset> }) => api.patch<CompanyAsset>(`/assets/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.assets.all }); },
  });
};

export const useAssignAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, employeeId }: { id: string; employeeId: string }) => api.post<CompanyAsset>(`/assets/${id}/assign`, { employeeId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.assets.all }); },
  });
};

export const useUnassignAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<CompanyAsset>(`/assets/${id}/unassign`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.assets.all }); },
  });
};

export const useDeleteAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/assets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.assets.all }); },
  });
};
