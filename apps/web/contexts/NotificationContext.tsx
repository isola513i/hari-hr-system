import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import type { NotificationItem } from '@hari/shared-types';
import {
  useNotificationsList,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '../hooks/queries';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: notifications = [], isPending: isLoading, refetch } = useNotificationsList();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const deleteMutation = useDeleteNotification();

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback(async (id: string) => {
    try {
      await markReadMutation.mutateAsync(id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [markReadMutation]);

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllReadMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [markAllReadMutation]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }, [deleteMutation]);

  const handleRefetch = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      isLoading,
      markAsRead,
      markAllAsRead,
      deleteNotification: handleDelete,
      refetch: handleRefetch,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
