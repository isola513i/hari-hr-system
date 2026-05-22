import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import type { Announcement } from '../../types';

export const useAnnouncements = () => {
  return useQuery({
    queryKey: queryKeys.announcements.list(),
    queryFn: () => api.get<Announcement[]>('/announcements'),
  });
};

export const useAddAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/announcements', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
  });
};

export const useUpdateAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/announcements/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
  });
};

export const useDeleteAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/announcements/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
  });
};

export const useAddEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/upcoming-events', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
};

export const useDeleteEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/upcoming-events/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
};
