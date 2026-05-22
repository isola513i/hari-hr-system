import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import type { OnboardingTask, KeyContact, OnboardingDocument } from '../../types';

export const useOnboardingTasks = () => {
  return useQuery({
    queryKey: queryKeys.onboarding.tasks(),
    queryFn: () => api.get<OnboardingTask[]>('/onboarding/tasks'),
  });
};

export const useOnboardingContacts = () => {
  return useQuery({
    queryKey: queryKeys.onboarding.contacts(),
    queryFn: () => api.get<KeyContact[]>('/onboarding/contacts'),
  });
};

export const useCreateContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; role: string; relation: string; email: string }) =>
      api.post<KeyContact>('/onboarding/contacts', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.onboarding.contacts() }); },
  });
};

export const useUpdateContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<KeyContact> }) =>
      api.put<KeyContact>(`/onboarding/contacts/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.onboarding.contacts() }); },
  });
};

export const useDeleteContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/onboarding/contacts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.onboarding.contacts() }); },
  });
};

export const useOnboardingDocuments = () => {
  return useQuery({
    queryKey: queryKeys.onboarding.documents(),
    queryFn: () => api.get<OnboardingDocument[]>('/onboarding/documents'),
  });
};
