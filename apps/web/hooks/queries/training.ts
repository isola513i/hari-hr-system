import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import type { EmployeeTrainingRecord, TrainingModule, TrainingAnalytics } from '../../types';

export const useEmployeeTraining = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.training.byEmployee(id!),
    queryFn: () => api.get<EmployeeTrainingRecord[]>(`/employee-training/${id}`),
    enabled: !!id,
  });
};

export const useTrainingModules = () => {
  return useQuery({
    queryKey: queryKeys.training.modules(),
    queryFn: () => api.get<TrainingModule[]>('/training/modules'),
  });
};

export const useTrainingAnalytics = () => {
  return useQuery({
    queryKey: queryKeys.training.analytics(),
    queryFn: () => api.get<TrainingAnalytics>('/training/analytics'),
  });
};

export const useCreateTrainingModule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TrainingModule>) =>
      api.post<TrainingModule>('/training/modules', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.training.all });
    },
  });
};

export const useUpdateTrainingModule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TrainingModule> }) =>
      api.put<TrainingModule>(`/training/modules/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.training.all });
    },
  });
};

export const useDeleteTrainingModule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/training/modules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.training.all });
    },
  });
};

export const useAssignTraining = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { employeeId: string; moduleId?: string; title?: string; duration?: string; dueDate?: string }) =>
      api.post('/training/assign', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.training.all });
    },
  });
};

export const useBulkAssignTraining = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { employeeIds: string[]; moduleId: string; dueDate?: string }) =>
      api.post('/training/bulk-assign', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.training.all });
    },
  });
};

export const useUpdateTrainingStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, score }: { id: string; status?: string; score?: number }) =>
      api.patch(`/training/${id}`, { status, score }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.training.all });
    },
  });
};

export const useDeleteTraining = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/training/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.training.all });
    },
  });
};
