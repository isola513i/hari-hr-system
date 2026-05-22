import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import type { NotificationItem } from '../../types';

export const useNotificationsList = () => {
  return useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () => api.get<NotificationItem[]>('/notifications'),
  });
};

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.notifications.list() });
      const prev = qc.getQueryData<NotificationItem[]>(queryKeys.notifications.list());
      qc.setQueryData<NotificationItem[]>(queryKeys.notifications.list(), (old) =>
        old?.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) qc.setQueryData(queryKeys.notifications.list(), context.prev);
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.put('/notifications/mark-all-read', {}),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.notifications.list() });
      const prev = qc.getQueryData<NotificationItem[]>(queryKeys.notifications.list());
      qc.setQueryData<NotificationItem[]>(queryKeys.notifications.list(), (old) =>
        old?.map((n) => ({ ...n, read: true })),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(queryKeys.notifications.list(), context.prev);
    },
  });
};

export const useDeleteNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.notifications.list() });
      const prev = qc.getQueryData<NotificationItem[]>(queryKeys.notifications.list());
      qc.setQueryData<NotificationItem[]>(queryKeys.notifications.list(), (old) =>
        old?.filter((n) => n.id !== id),
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) qc.setQueryData(queryKeys.notifications.list(), context.prev);
    },
  });
};
