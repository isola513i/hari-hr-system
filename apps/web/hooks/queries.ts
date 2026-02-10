import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, API_HOST } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import type {
  Employee,
  LeaveRequest,
  LeaveBalance,
  NotificationItem,
  OrgNode,
  AuditLogItem,
  ChartDataPoint,
  UpcomingEvent,
  Announcement,
  MyTeamHierarchy,
  PerformanceReview,
  JobHistoryItem,
  EmployeeTrainingRecord,
  DocumentItem,
  OnboardingTask,
  KeyContact,
  OnboardingDocument,
} from '@hari/shared-types';
import type { PaginatedResponse } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function transformAvatarUrl<T extends { avatar?: string | null }>(item: T): T {
  return {
    ...item,
    avatar: item.avatar && item.avatar.startsWith('/')
      ? `${API_HOST}${item.avatar}`
      : item.avatar,
  };
}

// ---------------------------------------------------------------------------
// Employee Queries
// ---------------------------------------------------------------------------

interface EmployeeListFilters {
  [key: string]: unknown;
  page?: number;
  limit?: number;
  department?: string;
  status?: string;
  search?: string;
}

export const useEmployeeList = (filters: EmployeeListFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.employees.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.department && filters.department !== 'All') params.append('department', filters.department);
      if (filters.status && filters.status !== 'All') params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const qs = params.toString();
      const response = await api.get<PaginatedResponse<Employee>>(qs ? `/employees?${qs}` : '/employees');

      if ('data' in response && 'pagination' in response) {
        return {
          ...response,
          data: response.data.map(transformAvatarUrl),
        };
      }
      // Fallback for non-paginated
      const arr = response as unknown as Employee[];
      return {
        data: arr.map(transformAvatarUrl),
        total: arr.length,
        page: 1,
        limit: arr.length,
        totalPages: 1,
      } as PaginatedResponse<Employee>;
    },
  });
};

export const useAllEmployees = () => {
  return useQuery({
    queryKey: queryKeys.employees.lists(),
    queryFn: async () => {
      const data = await api.get<Employee[]>('/employees');
      return data.map(transformAvatarUrl);
    },
  });
};

export const useEmployeeDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.employees.detail(id!),
    queryFn: () => api.get<Employee & Record<string, unknown>>(`/employees/${id}`),
    enabled: !!id,
  });
};

// ---------------------------------------------------------------------------
// Leave Queries
// ---------------------------------------------------------------------------

export const useLeaveRequests = () => {
  return useQuery({
    queryKey: queryKeys.leaveRequests.list(),
    queryFn: async () => {
      const data = await api.get<LeaveRequest[]>('/leave-requests');
      return data.map(transformAvatarUrl);
    },
  });
};

export const useLeaveBalance = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.leaveBalances.byEmployee(employeeId!),
    queryFn: () => api.get<LeaveBalance[]>(`/leave-balances/${employeeId}`),
    enabled: !!employeeId,
  });
};

// ---------------------------------------------------------------------------
// Notification Queries
// ---------------------------------------------------------------------------

export const useNotificationsList = () => {
  return useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () => api.get<NotificationItem[]>('/notifications'),
  });
};

// ---------------------------------------------------------------------------
// Org Chart Queries
// ---------------------------------------------------------------------------

export const useOrgChart = () => {
  return useQuery({
    queryKey: queryKeys.orgChart.tree(),
    queryFn: () => api.get<OrgNode[]>('/org-chart'),
  });
};

export const useOrgSubtree = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.orgChart.subtree(employeeId!),
    queryFn: () => api.get<OrgNode[]>(`/org-chart/subtree/${employeeId}`),
    enabled: !!employeeId,
  });
};

// ---------------------------------------------------------------------------
// Dashboard Queries
// ---------------------------------------------------------------------------

interface EmployeeStats {
  leaveBalance: number;
  nextPayday: string | null;
  pendingReviews: number;
  pendingSurveys: number;
}

export const useDashboardEmployeeStats = (enabled: boolean) => {
  return useQuery({
    queryKey: queryKeys.dashboard.employeeStats(),
    queryFn: () => api.get<EmployeeStats>('/dashboard/employee-stats'),
    enabled,
  });
};

export const useMyTeamHierarchy = (enabled: boolean) => {
  return useQuery({
    queryKey: queryKeys.dashboard.teamHierarchy(),
    queryFn: () => api.get<MyTeamHierarchy>('/dashboard/my-team-hierarchy'),
    enabled,
  });
};

// ---------------------------------------------------------------------------
// Attendance Queries
// ---------------------------------------------------------------------------

interface AttendanceStatus {
  id?: string;
  clockIn?: string;
  clockOut?: string;
  status?: string;
}

export const useAttendanceToday = (enabled: boolean) => {
  return useQuery({
    queryKey: queryKeys.attendance.today(),
    queryFn: () => api.get<AttendanceStatus>('/attendance/today'),
    enabled,
  });
};

interface AttendanceRecord {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  status: string;
  hoursWorked: number | null;
  totalHours: number | null;
  overtime: number;
}

export const useAttendanceRecords = (id: string | undefined, month: number, year: number) => {
  return useQuery({
    queryKey: queryKeys.attendance.employee(id!, { month, year }),
    queryFn: () => {
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      return api.get<AttendanceRecord[]>(`/attendance/employee/${id}?startDate=${startDate}&endDate=${endDate}`);
    },
    enabled: !!id,
  });
};

interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  averageHours: number;
  overtimeHours: number;
  remoteDays?: number;
  totalHours?: number;
}

export const useAttendanceSummary = (id: string | undefined, month: number, year: number) => {
  return useQuery({
    queryKey: queryKeys.attendance.summary(id!, { month, year }),
    queryFn: () => {
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      return api.get<AttendanceSummary>(`/attendance/summary/${id}?startDate=${startDate}&endDate=${endDate}`);
    },
    enabled: !!id,
  });
};

// ---------------------------------------------------------------------------
// Widget Queries (Dashboard)
// ---------------------------------------------------------------------------

export const useAuditLogs = () => {
  return useQuery({
    queryKey: queryKeys.auditLogs.list(),
    queryFn: () => api.get<AuditLogItem[]>('/audit-logs'),
  });
};

export const useHeadcountStats = () => {
  return useQuery({
    queryKey: queryKeys.headcount.stats(),
    queryFn: () => api.get<ChartDataPoint[]>('/headcount-stats'),
  });
};

export const useUpcomingEvents = () => {
  return useQuery({
    queryKey: queryKeys.events.list(),
    queryFn: async () => {
      const data = await api.get<UpcomingEvent[]>('/upcoming-events').catch(() => [] as UpcomingEvent[]);
      return data.map((e): UpcomingEvent => transformAvatarUrl(e));
    },
  });
};

export const useAnnouncements = () => {
  return useQuery({
    queryKey: queryKeys.announcements.list(),
    queryFn: () => api.get<Announcement[]>('/announcements'),
  });
};

// ---------------------------------------------------------------------------
// Notes Queries
// ---------------------------------------------------------------------------

interface Note {
  id: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export const useNotes = () => {
  return useQuery({
    queryKey: queryKeys.notes.list(),
    queryFn: () => api.get<Note[]>('/notes'),
  });
};

// ---------------------------------------------------------------------------
// Document Queries
// ---------------------------------------------------------------------------

interface DocumentListFilters {
  [key: string]: unknown;
  page?: number;
  limit?: number;
  category?: string;
  type?: string;
  search?: string;
}

export const useDocumentList = (filters: DocumentListFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.documents.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.category && filters.category !== 'All') params.append('category', filters.category);
      if (filters.type && filters.type !== 'All') params.append('type', filters.type);
      if (filters.search) params.append('search', filters.search);
      const qs = params.toString();
      return api.get<PaginatedResponse<DocumentItem>>(qs ? `/documents?${qs}` : '/documents');
    },
  });
};

interface StorageInfo {
  used: number;
  total: number;
  percentage: number;
}

export const useDocumentTrash = () => {
  return useQuery({
    queryKey: queryKeys.documents.trash(),
    queryFn: () => api.get<DocumentItem[]>('/documents/trash'),
  });
};

export const useDocumentStorage = () => {
  return useQuery({
    queryKey: queryKeys.documents.storage(),
    queryFn: () => api.get<StorageInfo>('/documents/storage'),
  });
};

// ---------------------------------------------------------------------------
// Onboarding Queries
// ---------------------------------------------------------------------------

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

export const useOnboardingDocuments = () => {
  return useQuery({
    queryKey: queryKeys.onboarding.documents(),
    queryFn: () => api.get<OnboardingDocument[]>('/onboarding/documents'),
  });
};

// ---------------------------------------------------------------------------
// Employee Detail Sub-resource Queries
// ---------------------------------------------------------------------------

export const useJobHistory = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.jobHistory.byEmployee(id!),
    queryFn: () => api.get<JobHistoryItem[]>(`/employees/${id}/job-history`),
    enabled: !!id,
  });
};

export const usePerformanceReviews = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.performanceReviews.byEmployee(id!),
    queryFn: () => api.get<PerformanceReview[]>(`/performance/reviews?employeeId=${id}`),
    enabled: !!id,
  });
};

export const useEmployeeTraining = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.training.byEmployee(id!),
    queryFn: () => api.get<EmployeeTrainingRecord[]>(`/employees/${id}/training`),
    enabled: !!id,
  });
};

export const useEmployeeDocuments = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.employeeDocuments.byEmployee(id!),
    queryFn: () => api.get<DocumentItem[]>(`/employees/${id}/documents`),
    enabled: !!id,
  });
};

// ===========================================================================
// MUTATIONS
// ===========================================================================

// ---------------------------------------------------------------------------
// Employee Mutations
// ---------------------------------------------------------------------------

export const useAddEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<Employee>('/employees', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.employees.all });
      qc.invalidateQueries({ queryKey: queryKeys.orgChart.all });
    },
  });
};

export const useUpdateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch<Employee>(`/employees/${id}`, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.employees.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.employees.lists() });
      qc.invalidateQueries({ queryKey: queryKeys.orgChart.all });
    },
  });
};

export const useDeleteEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}?cascade=true`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.employees.all });
      qc.invalidateQueries({ queryKey: queryKeys.orgChart.all });
    },
  });
};

// ---------------------------------------------------------------------------
// Leave Mutations
// ---------------------------------------------------------------------------

export const useAddLeaveRequest = () => {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/leave-requests', data),
    // Socket handles real-time update
  });
};

export const useUpdateLeaveStatus = () => {
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Approved' | 'Rejected' }) =>
      api.patch(`/leave-requests/${id}`, { status }),
    // Socket handles real-time update
  });
};

// ---------------------------------------------------------------------------
// Notification Mutations (optimistic)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Attendance Mutations
// ---------------------------------------------------------------------------

export const useClockIn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/attendance/clock-in', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.attendance.today() });
    },
  });
};

export const useClockOut = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/attendance/clock-out', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.attendance.today() });
    },
  });
};

// ---------------------------------------------------------------------------
// Notes Mutations
// ---------------------------------------------------------------------------

export const useAddNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { content: string }) => api.post('/notes', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notes.all });
    },
  });
};

export const useDeleteNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notes.all });
    },
  });
};

export const useToggleNotePin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/notes/${id}/toggle-pin`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notes.all });
    },
  });
};

// ---------------------------------------------------------------------------
// Announcement / Event Mutations
// ---------------------------------------------------------------------------

export const useAddAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/announcements', data),
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

// ---------------------------------------------------------------------------
// Document Mutations
// ---------------------------------------------------------------------------

export const useDeleteDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
};

export const useRestoreDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/documents/${id}/restore`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
};

export const usePermanentDeleteDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}/permanent`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
};

// ---------------------------------------------------------------------------
// Settings / Auth Mutations
// ---------------------------------------------------------------------------

export const useChangePassword = () => {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/change-password', data),
  });
};

// ---------------------------------------------------------------------------
// Org Chart Mutations
// ---------------------------------------------------------------------------

export const useAddOrgNode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/employees', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.employees.all });
      qc.invalidateQueries({ queryKey: queryKeys.orgChart.all });
    },
  });
};

export const useUpdateOrgNode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/employees/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.employees.all });
      qc.invalidateQueries({ queryKey: queryKeys.orgChart.all });
    },
  });
};

export const useDeleteOrgNode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}?cascade=true`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.employees.all });
      qc.invalidateQueries({ queryKey: queryKeys.orgChart.all });
    },
  });
};
