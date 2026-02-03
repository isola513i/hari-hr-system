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

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'leave'
  | 'employee'
  | 'document'
  | 'system';

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
  time: string; // Formatted relative time (e.g., "5 min ago")
  created_at: Date;
}
