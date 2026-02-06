import React, { useState } from 'react';
import {
  Bell,
  Info,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Users,
  FileText,
  Settings,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { NotificationType } from '../types';

const typeConfig: Record<NotificationType, { icon: React.ElementType; bg: string; text: string }> = {
  info: { icon: Info, bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  success: { icon: CheckCircle2, bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
  warning: { icon: AlertTriangle, bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
  leave: { icon: Calendar, bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  employee: { icon: Users, bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400' },
  document: { icon: FileText, bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400' },
  system: { icon: Settings, bg: 'bg-gray-100 dark:bg-gray-700/30', text: 'text-gray-600 dark:text-gray-400' },
};

type FilterTab = 'all' | 'unread';

const Notifications: React.FC = () => {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const handleClick = async (id: string, link?: string) => {
    await markAsRead(id);
    if (link) {
      navigate(link);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      showToast('Notification deleted', 'success');
    } catch {
      showToast('Failed to delete notification', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    showToast('All notifications marked as read', 'success');
  };

  if (isLoading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <CheckCheck size={16} />
            Mark All as Read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-6 bg-background-light dark:bg-background-dark p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'all'
              ? 'bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark shadow-sm'
              : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'unread'
              ? 'bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark shadow-sm'
              : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notification List */}
      {filteredNotifications.length > 0 ? (
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden shadow-sm">
          {filteredNotifications.map((notif, index) => {
            const config = typeConfig[notif.type] || typeConfig.info;
            const Icon = config.icon;

            return (
              <div
                key={notif.id}
                onClick={() => handleClick(notif.id, notif.link)}
                className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-background-light dark:hover:bg-background-dark ${
                  !notif.read ? 'bg-primary/5 dark:bg-primary/10' : ''
                } ${index < filteredNotifications.length - 1 ? 'border-b border-border-light dark:border-border-dark' : ''}`}
              >
                {/* Type Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                  <Icon size={18} className={config.text} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm text-text-light dark:text-text-dark ${!notif.read ? 'font-semibold' : 'font-medium'}`}>
                        {notif.title}
                      </p>
                      <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1.5">
                        {notif.time}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notif.read && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0"></div>
                      )}
                      <button
                        onClick={(e) => handleDelete(e, notif.id)}
                        className="p-1.5 rounded-lg text-text-muted-light dark:text-text-muted-dark hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete notification"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-background-light dark:bg-background-dark flex items-center justify-center mb-4">
            <Bell size={28} className="text-text-muted-light dark:text-text-muted-dark" />
          </div>
          <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-1">
            No notifications
          </h3>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
            {activeTab === 'unread' ? "You're all caught up!" : "You don't have any notifications yet."}
          </p>
        </div>
      )}
    </div>
  );
};

export default Notifications;
