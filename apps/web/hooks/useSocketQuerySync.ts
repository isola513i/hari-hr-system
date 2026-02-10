import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../lib/socket';
import { queryKeys } from '../lib/queryKeys';
import { API_HOST } from '../lib/api';
import type { LeaveRequest, NotificationItem } from '@hari/shared-types';

const transformAvatarUrl = (req: LeaveRequest): LeaveRequest => ({
  ...req,
  avatar: req.avatar && req.avatar.startsWith('/')
    ? `${API_HOST}${req.avatar}`
    : req.avatar,
});

export const useSocketQuerySync = () => {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    // -- Leave Request events --
    const onLeaveCreated = (newRequest: LeaveRequest) => {
      const transformed = transformAvatarUrl(newRequest);
      qc.setQueryData<LeaveRequest[]>(queryKeys.leaveRequests.list(), (old) =>
        old ? [...old, transformed] : [transformed],
      );
    };

    const onLeaveUpdated = (updatedRequest: LeaveRequest) => {
      const transformed = transformAvatarUrl(updatedRequest);
      qc.setQueryData<LeaveRequest[]>(queryKeys.leaveRequests.list(), (old) =>
        old?.map((r) => (r.id === updatedRequest.id ? transformed : r)),
      );
    };

    const onLeaveDeleted = ({ id }: { id: string }) => {
      qc.setQueryData<LeaveRequest[]>(queryKeys.leaveRequests.list(), (old) =>
        old?.filter((r) => r.id !== id),
      );
    };

    // -- Notification events --
    const onNotificationNew = (notification: NotificationItem) => {
      qc.setQueryData<NotificationItem[]>(queryKeys.notifications.list(), (old) =>
        old ? [notification, ...old] : [notification],
      );
    };

    const onNotificationRefresh = () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.list() });
    };

    socket.on('leave-request:created', onLeaveCreated);
    socket.on('leave-request:updated', onLeaveUpdated);
    socket.on('leave-request:deleted', onLeaveDeleted);
    socket.on('notification:new', onNotificationNew);
    socket.on('notification:refresh', onNotificationRefresh);

    return () => {
      socket.off('leave-request:created', onLeaveCreated);
      socket.off('leave-request:updated', onLeaveUpdated);
      socket.off('leave-request:deleted', onLeaveDeleted);
      socket.off('notification:new', onNotificationNew);
      socket.off('notification:refresh', onNotificationRefresh);
    };
  }, [qc]);
};
