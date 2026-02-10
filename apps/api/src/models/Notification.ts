export type { NotificationType } from '@hari/shared-types';
import type { NotificationType } from '@hari/shared-types';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  created_at: Date;
}

export interface CreateNotificationRequest {
  user_id: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}

export interface NotificationResponse {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  time: string;
  created_at: Date;
}
