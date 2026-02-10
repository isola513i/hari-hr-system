export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'leave'
  | 'employee'
  | 'document'
  | 'system';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  time: string;
  created_at: string;
}
