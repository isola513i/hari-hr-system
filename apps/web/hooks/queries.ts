import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, API_HOST, BASE_URL, getAuthToken } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import type {
  Employee,
  LeaveRequest,
  LeaveBalance,
  LeaveQuotaConfig,
  NotificationItem,
  OrgNode,
  AuditLogItem,
  ChartDataPoint,
  UpcomingEvent,
  Announcement,
  MyTeamHierarchy,
  PaginatedResponse,
  PerformanceReview,
  JobHistoryItem,
  EmployeeTrainingRecord,
  DocumentItem,
  OnboardingTask,
  KeyContact,
  OnboardingDocument,
  AdminAttendanceRecord,
  AdminAttendanceSnapshotV2,
  AdminAttendanceUpsertData,
  AdminAttendanceFilters,
  AttendanceAnalytics,
  SurveyListItem,
  SurveyDetail,
  SentimentOverview,
  EffectiveLeaveQuota,
  PublicHoliday,
  TrainingModule,
  TrainingAnalytics,
  ComplianceItem,
  CompanyAsset,
} from '../types';

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

interface AdminDashboardStats {
  newHiresCount: number;
  newHiresTrend: number;
  turnoverRate: number;
  turnoverTrend: number;
}

export const useAdminDashboardStats = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.adminStats(),
    queryFn: () => api.get<AdminDashboardStats>('/dashboard/admin-stats'),
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
  autoCheckout?: boolean;
  checkInType?: string;
  clockInLat?: number | null;
  clockInLng?: number | null;
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
  autoCheckout: boolean;
  earlyDeparture: boolean;
  overtimeHours: number | null;
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

// ---------------------------------------------------------------------------
// Employee Detail Sub-resource Queries
// ---------------------------------------------------------------------------

export const useJobHistory = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.jobHistory.byEmployee(id!),
    queryFn: () => api.get<JobHistoryItem[]>(`/job-history?employeeId=${id}`),
    enabled: !!id,
  });
};

export const useUpdateJobHistory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<JobHistoryItem> }) =>
      api.put<JobHistoryItem>(`/job-history/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.jobHistory.all });
    },
  });
};

export const useDeleteJobHistory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/job-history/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.jobHistory.all });
    },
  });
};

export const usePerformanceReviews = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.performanceReviews.byEmployee(id!),
    queryFn: () => api.get<PerformanceReview[]>(`/performance/reviews?employeeId=${id}`),
    enabled: !!id,
  });
};

export const useAllPerformanceReviews = (filters?: { status?: string }) => {
  return useQuery({
    queryKey: queryKeys.performanceReviews.list(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      return api.get<PerformanceReview[]>(`/performance/reviews?${params.toString()}`);
    },
    staleTime: 30000,
  });
};

export const useCreateSelfReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { selfReview: string; reviewPeriod?: string }) =>
      api.post<PerformanceReview>('/performance/reviews/self', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.performanceReviews.all });
    },
  });
};

export const useSubmitSelfReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<PerformanceReview>(`/performance/reviews/${id}/submit`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.performanceReviews.all });
    },
  });
};

export const useManagerReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rating, managerComment }: { id: string; rating: number; managerComment: string }) =>
      api.put<PerformanceReview>(`/performance/reviews/${id}/manager-review`, { rating, managerComment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.performanceReviews.all });
    },
  });
};

export const useHrApproveReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hrComment }: { id: string; hrComment?: string }) =>
      api.put<PerformanceReview>(`/performance/reviews/${id}/hr-approve`, { hrComment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.performanceReviews.all });
    },
  });
};

export const useRejectReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.put<PerformanceReview>(`/performance/reviews/${id}/reject`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.performanceReviews.all });
    },
  });
};

export const useManagerExpenseQueue = () => {
  return useQuery({
    queryKey: ['expenseClaims', 'managerQueue'],
    queryFn: () => api.get<any[]>('/expense-claims/manager-queue'),
    staleTime: 30000,
  });
};

export const useManagerApproveExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/expense-claims/${id}/manager-approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenseClaims'] });
    },
  });
};

export const useTeamCalendar = (month: string, department?: string) => {
  return useQuery({
    queryKey: queryKeys.teamCalendar.byMonth(month, department),
    queryFn: () => {
      const params = new URLSearchParams({ month });
      if (department) params.set('department', department);
      return api.get<{ month: string; events: any[]; departments: string[] }>(`/calendar/team?${params.toString()}`);
    },
    staleTime: 30000,
  });
};

export const useEmployeeTraining = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.training.byEmployee(id!),
    queryFn: () => api.get<EmployeeTrainingRecord[]>(`/employee-training/${id}`),
    enabled: !!id,
  });
};

export const useTrainingModules = () => {
  return useQuery({
    queryKey: queryKeys.training.modules(),
    queryFn: () => api.get<TrainingModule[]>('/training/modules'),
  });
};

export const useTrainingAnalytics = () => {
  return useQuery({
    queryKey: queryKeys.training.analytics(),
    queryFn: () => api.get<TrainingAnalytics>('/training/analytics'),
  });
};

export const useCreateTrainingModule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TrainingModule>) =>
      api.post<TrainingModule>('/training/modules', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.training.all });
    },
  });
};

export const useUpdateTrainingModule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TrainingModule> }) =>
      api.put<TrainingModule>(`/training/modules/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.training.all });
    },
  });
};

export const useDeleteTrainingModule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/training/modules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.training.all });
    },
  });
};

export const useAssignTraining = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { employeeId: string; moduleId?: string; title?: string; duration?: string; dueDate?: string }) =>
      api.post('/training/assign', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.training.all });
    },
  });
};

export const useBulkAssignTraining = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { employeeIds: string[]; moduleId: string; dueDate?: string }) =>
      api.post('/training/bulk-assign', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.training.all });
    },
  });
};

export const useUpdateTrainingStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, score }: { id: string; status?: string; score?: number }) =>
      api.patch(`/training/${id}`, { status, score }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.training.all });
    },
  });
};

export const useDeleteTraining = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/training/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.training.all });
    },
  });
};

export const useEmployeeDocuments = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.employeeDocuments.byEmployee(id!),
    queryFn: () => api.get<DocumentItem[]>('/documents'),
    enabled: !!id,
  });
};

export const useEmployeeManager = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.employeeManager.byEmployee(id!),
    queryFn: async () => {
      const data = await api.get<Employee>(`/employees/${id}/manager`).catch(() => null);
      return data ? transformAvatarUrl(data) : null;
    },
    enabled: !!id,
  });
};

export const useEmployeeDirectReports = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.employeeDirectReports.byEmployee(id!),
    queryFn: async () => {
      const data = await api.get<Employee[]>(`/employees/${id}/direct-reports`).catch(() => []);
      return data.map(transformAvatarUrl);
    },
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
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
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

export const useAddLeaveRequestWithFile = () => {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const token = getAuthToken();
      const response = await fetch(`${BASE_URL}/leave-requests`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Failed to submit leave request');
      }
      return response.json();
    },
  });
};

export const useUpdateLeaveStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, rejectionReason }: { id: string; status: 'Approved' | 'Rejected'; rejectionReason?: string }) =>
      api.patch(`/leave-requests/${id}`, { status, rejectionReason }),
    onMutate: async ({ id, status, rejectionReason }) => {
      await qc.cancelQueries({ queryKey: queryKeys.leaveRequests.list() });
      const previous = qc.getQueryData<LeaveRequest[]>(queryKeys.leaveRequests.list());

      qc.setQueryData<LeaveRequest[]>(queryKeys.leaveRequests.list(), (old) => {
        if (!old) return old;
        return old.map((r) =>
          r.id === id ? { ...r, status: status as LeaveRequest['status'], rejectionReason } : r,
        );
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.leaveRequests.list(), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
      qc.invalidateQueries({ queryKey: queryKeys.leaveBalances.all });
    },
  });
};

export const useCancelLeaveRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ action: 'deleted' | 'cancel_requested' }>(`/leave-requests/${id}/cancel`, {}),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.leaveRequests.list() });
      const previous = qc.getQueryData<LeaveRequest[]>(queryKeys.leaveRequests.list());

      qc.setQueryData<LeaveRequest[]>(queryKeys.leaveRequests.list(), (old) => {
        if (!old) return old;
        return old.flatMap((r) => {
          if (r.id !== id) return [r];
          if (r.status === 'Pending') return [];
          return [{ ...r, status: 'Cancel Requested' as LeaveRequest['status'] }];
        });
      });

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.leaveRequests.list(), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
      qc.invalidateQueries({ queryKey: queryKeys.leaveBalances.all });
    },
  });
};

export const useEditLeaveRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: FormData }) => {
      const token = getAuthToken();
      const response = await fetch(`${BASE_URL}/leave-requests/${id}`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Failed to edit leave request');
      }
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.leaveRequests.all }),
        qc.invalidateQueries({ queryKey: queryKeys.leaveBalances.all }),
      ]);
    },
  });
};

export const useHandleCancelDecision = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approve_cancel' | 'reject_cancel' }) =>
      api.post(`/leave-requests/${id}/cancel-decision`, { decision }),
    onMutate: async ({ id, decision }) => {
      await qc.cancelQueries({ queryKey: queryKeys.leaveRequests.list() });
      const previous = qc.getQueryData<LeaveRequest[]>(queryKeys.leaveRequests.list());

      qc.setQueryData<LeaveRequest[]>(queryKeys.leaveRequests.list(), (old) => {
        if (!old) return old;
        if (decision === 'approve_cancel') {
          return old.filter((r) => r.id !== id);
        }
        return old.map((r) =>
          r.id === id ? { ...r, status: 'Approved' as LeaveRequest['status'] } : r,
        );
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.leaveRequests.list(), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
      qc.invalidateQueries({ queryKey: queryKeys.leaveBalances.all });
    },
  });
};

export const useLeaveRequestById = (id: string | undefined) => {
  const { data: allRequests = [] } = useLeaveRequests();
  const request = id ? allRequests.find((r) => r.id === id) : undefined;
  return { data: request, isPending: false };
};

export const useEmployeeSearch = (searchQuery: string) => {
  return useQuery({
    queryKey: [...queryKeys.employees.all, 'search', searchQuery] as const,
    queryFn: async () => {
      const data = await api.get<Employee[]>('/employees');
      if (!searchQuery.trim()) return data.map(transformAvatarUrl);
      const q = searchQuery.toLowerCase();
      return data
        .filter((e) => e.name.toLowerCase().includes(q) || e.department?.toLowerCase().includes(q))
        .map(transformAvatarUrl);
    },
    enabled: true,
    staleTime: 30_000,
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
    mutationFn: (payload?: { latitude?: number; longitude?: number; accuracy?: number; notes?: string }) =>
      api.post('/attendance/clock-in', payload ?? {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.attendance.all });
    },
  });
};

export const useClockOut = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/attendance/clock-out', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.attendance.all });
    },
  });
};

// ---------------------------------------------------------------------------
// WFH Requests
// ---------------------------------------------------------------------------

export const useMyWFHRequests = () =>
  useQuery({
    queryKey: ['wfh-requests', 'my'],
    queryFn: () => api.get<unknown[]>('/wfh-requests/my'),
  });

export const useAdminWFHRequests = (filters?: { status?: string; date?: string } | false) => {
  const enabled = filters !== false;
  const f = enabled ? filters : undefined;
  const qs = f && Object.keys(f).length > 0
    ? '?' + new URLSearchParams(f as Record<string, string>).toString()
    : '';
  return useQuery({
    queryKey: ['wfh-requests', 'admin', f],
    queryFn: () => api.get<unknown[]>(`/wfh-requests/admin${qs}`),
    enabled,
  });
};

export const useCreateWFHRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; reason?: string }) => api.post('/wfh-requests', data as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wfh-requests'] });
    },
  });
};

export const useApproveWFH = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put(`/wfh-requests/${id}/approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wfh-requests'] });
    },
  });
};

export const useRejectWFH = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put(`/wfh-requests/${id}/reject`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wfh-requests'] });
    },
  });
};

export const useManagerApproveWFH = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put(`/wfh-requests/${id}/manager-approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wfh-requests'] });
    },
  });
};

// ---------------------------------------------------------------------------
// OT Requests
// ---------------------------------------------------------------------------

export interface OTRequest {
  id: string;
  employeeId: string;
  date: string;
  plannedStart: string;
  plannedEnd: string;
  plannedHours: number;
  actualHours: number | null;
  otType: 'regular' | 'holiday';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  employeeName?: string;
  employeeAvatar?: string;
  department?: string;
  reviewerName?: string;
}

export const useMyOTRequests = (filters?: { status?: string; month?: string }) => {
  const qs = filters && Object.keys(filters).length > 0
    ? '?' + new URLSearchParams(filters as Record<string, string>).toString()
    : '';
  return useQuery({
    queryKey: ['ot-requests', 'my', filters],
    queryFn: () => api.get<OTRequest[]>(`/ot-requests/my${qs}`),
  });
};

export const useAllOTRequests = (filters?: { status?: string; employeeName?: string; month?: string; department?: string } | false) => {
  const enabled = filters !== false;
  const f = enabled ? filters : undefined;
  const qs = f && Object.keys(f).length > 0
    ? '?' + new URLSearchParams(f as Record<string, string>).toString()
    : '';
  return useQuery({
    queryKey: ['ot-requests', 'admin', f],
    queryFn: () => api.get<OTRequest[]>(`/ot-requests${qs}`),
    enabled,
  });
};

export const useOTStats = () =>
  useQuery({
    queryKey: ['ot-requests', 'stats'],
    queryFn: () => api.get<{ pending: number; approvedThisMonth: number; totalOTHoursThisMonth: number; topEmployees: { employeeId: string; name: string; hours: number }[] }>('/ot-requests/stats'),
  });

export const useCreateOTRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; plannedStart: string; plannedEnd: string; plannedHours: number; otType?: string; reason: string }) =>
      api.post('/ot-requests', data as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ot-requests'] });
    },
  });
};

export const useApproveOT = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      api.put(`/ot-requests/${id}/approve`, { notes } as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ot-requests'] });
    },
  });
};

export const useRejectOT = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      api.put(`/ot-requests/${id}/reject`, { notes } as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ot-requests'] });
    },
  });
};

export const useCancelOTRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/ot-requests/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ot-requests'] });
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
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.employees.all });
      qc.invalidateQueries({ queryKey: queryKeys.orgChart.all });
    },
  });
};

// ---------------------------------------------------------------------------
// Admin Attendance Queries
// ---------------------------------------------------------------------------

export const useAdminAttendanceSnapshot = () => {
  return useQuery({
    queryKey: queryKeys.adminAttendance.snapshot(),
    queryFn: () => api.get<AdminAttendanceSnapshotV2>('/admin/attendance/snapshot'),
    refetchInterval: 60_000,
  });
};

export const useAdminAttendanceCalendar = (startDate: string, endDate: string, enabled = true) => {
  return useQuery({
    queryKey: [...queryKeys.adminAttendance.all, 'calendar', startDate, endDate],
    queryFn: () =>
      api.get<{ employeeId: string; date: string }[]>(
        `/admin/attendance/calendar?startDate=${startDate}&endDate=${endDate}`
      ),
    enabled: enabled && !!startDate && !!endDate,
  });
};

export const useAdminAttendanceRecords = (filters: AdminAttendanceFilters, options?: { refetchInterval?: number | false }) => {
  return useQuery({
    queryKey: queryKeys.adminAttendance.records(filters as Record<string, unknown>),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.department && filters.department !== 'All') params.append('department', filters.department);
      if (filters.status && filters.status !== 'All') params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      const qs = params.toString();
      const result = await api.get<PaginatedResponse<AdminAttendanceRecord>>(
        qs ? `/admin/attendance/records?${qs}` : '/admin/attendance/records'
      );
      return {
        ...result,
        data: result.data.map((r: AdminAttendanceRecord) => ({
          ...r,
          employeeAvatar:
            r.employeeAvatar && r.employeeAvatar.startsWith('/')
              ? `${API_HOST}${r.employeeAvatar}`
              : r.employeeAvatar,
        })),
      };
    },
    refetchInterval: options?.refetchInterval,
  });
};

export const useAttendanceAnalytics = (days: number = 14) => {
  return useQuery({
    queryKey: [...queryKeys.adminAttendance.all, 'analytics', days],
    queryFn: () => api.get<AttendanceAnalytics>(`/admin/attendance/analytics?days=${days}`),
    staleTime: 5 * 60_000,
  });
};

// ---------------------------------------------------------------------------
// Admin Attendance Mutations
// ---------------------------------------------------------------------------

export const useAdminUpsertAttendance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminAttendanceUpsertData) =>
      api.put('/admin/attendance/records', data as unknown as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminAttendance.all });
      qc.invalidateQueries({ queryKey: queryKeys.attendance.all });
    },
  });
};

export const useAdminDeleteAttendance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/attendance/records/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminAttendance.all });
      qc.invalidateQueries({ queryKey: queryKeys.attendance.all });
    },
  });
};

// ---------------------------------------------------------------------------
// Survey Queries
// ---------------------------------------------------------------------------

export const useSurveyList = () => {
  return useQuery({
    queryKey: queryKeys.surveys.list(),
    queryFn: () => api.get<SurveyListItem[]>('/surveys'),
  });
};

export const useSurveyDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.surveys.detail(id!),
    queryFn: () => api.get<SurveyDetail>(`/surveys/${id}`),
    enabled: !!id,
  });
};

export const useSentimentOverview = () => {
  return useQuery({
    queryKey: queryKeys.surveys.sentiment(),
    queryFn: () => api.get<SentimentOverview>('/surveys/sentiment'),
  });
};

// ---------------------------------------------------------------------------
// Survey Mutations
// ---------------------------------------------------------------------------

export const useCreateSurvey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; questions: Array<{ questionText: string; category: string; sortOrder: number }>; allowRetake?: boolean }) =>
      api.post('/surveys', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.surveys.all });
    },
  });
};

export const useSubmitSurveyResponse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ surveyId, responses }: { surveyId: string; responses: Array<{ questionId: string; rating: number }> }) =>
      api.post(`/surveys/${surveyId}/respond`, { responses }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.surveys.all });
    },
  });
};

export const useCloseSurvey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/surveys/${id}/close`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.surveys.all });
    },
  });
};

export const useReopenSurvey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/surveys/${id}/reopen`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.surveys.all });
    },
  });
};

export const useDeleteSurvey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/surveys/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.surveys.all });
    },
  });
};

// ---------------------------------------------------------------------------
// Employee Leave Quota Queries & Mutations
// ---------------------------------------------------------------------------

export const useEmployeeLeaveQuotas = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.leaveQuotas.byEmployee(employeeId!),
    queryFn: () => api.get<EffectiveLeaveQuota[]>(`/employees/${employeeId}/leave-quotas`),
    enabled: !!employeeId,
  });
};

export const useUpdateEmployeeLeaveQuotas = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, overrides }: { employeeId: string; overrides: Array<{ leaveType: string; total: number }> }) =>
      api.put<EffectiveLeaveQuota[]>(`/employees/${employeeId}/leave-quotas`, { overrides } as unknown as Record<string, unknown>),
    onSuccess: (_data, { employeeId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.leaveQuotas.byEmployee(employeeId) });
      qc.invalidateQueries({ queryKey: queryKeys.leaveBalances.all });
    },
  });
};

export const useDeleteLeaveQuotaOverride = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, leaveType }: { employeeId: string; leaveType: string }) =>
      api.delete<EffectiveLeaveQuota[]>(`/employees/${employeeId}/leave-quotas/${encodeURIComponent(leaveType)}`),
    onSuccess: (_data, { employeeId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.leaveQuotas.byEmployee(employeeId) });
      qc.invalidateQueries({ queryKey: queryKeys.leaveBalances.all });
    },
  });
};

// ---------------------------------------------------------------------------
// System Config — Leave Type Configs
// ---------------------------------------------------------------------------

const DEFAULT_LEAVE_TYPE_CONFIGS: LeaveQuotaConfig[] = [
  { type: 'Vacation', total: 7, color: 'blue' },
  { type: 'Sick Leave', total: 30, color: 'amber' },
  { type: 'Personal Day', total: 6, color: 'violet' },
  { type: 'Leave Without Pay', total: -1, color: 'orange' },
];

export const useLeaveTypeConfig = () => {
  return useQuery({
    queryKey: queryKeys.systemConfig.leaveQuotas(),
    queryFn: async () => {
      try {
        const data = await api.get<{ key: string; value: string }>('/configs/leave/quotas');
        const parsed: LeaveQuotaConfig[] = JSON.parse(data.value);
        return parsed;
      } catch (err) {
        console.warn('[useLeaveTypeConfig] Failed to fetch leave type configs, using defaults:', err);
        return DEFAULT_LEAVE_TYPE_CONFIGS;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateLeaveTypeConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (configs: LeaveQuotaConfig[]) =>
      api.put('/configs/leave/quotas', { value: JSON.stringify(configs) } as unknown as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.systemConfig.leaveQuotas() });
      qc.invalidateQueries({ queryKey: queryKeys.leaveBalances.all });
    },
  });
};

// ---------------------------------------------------------------------------
// Compliance Queries
// ---------------------------------------------------------------------------

export interface ComplianceCheck {
  id: string;
  titleKey: string;
  status: 'Complete' | 'In Progress' | 'Overdue';
  detail: string;
  percentage: number;
}

// ---------------------------------------------------------------------------
// Payroll
// ---------------------------------------------------------------------------

export interface PayrollRecord {
  id: string;
  employeeId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  baseSalary: number;
  overtimeHours: number;
  overtimePay: number;
  bonus: number;
  leaveDeduction: number;
  deductions: number;
  taxAmount: number;
  ssfEmployee: number;
  ssfEmployer: number;
  pvfEmployee: number;
  pvfEmployer: number;
  netPay: number;
  status: 'Pending' | 'Processed' | 'Paid' | 'Cancelled';
  paymentDate: string | null;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
}

export interface SalaryHistoryRecord {
  id: string;
  employeeId: string;
  effectiveDate: string;
  baseSalary: number;
  previousSalary: number | null;
  changeReason: string | null;
  approvedBy: string | null;
  createdAt: string;
}

export interface PayrollSummary {
  totalPayroll: number;
  totalTax: number;
  totalEmployees: number;
  pendingCount: number;
  processedCount: number;
  paidCount: number;
  cancelledCount: number;
}

export const useMyPayslips = () => {
  return useQuery({
    queryKey: queryKeys.payroll.myPayslips(),
    queryFn: () => api.get<PayrollRecord[]>('/payroll/my-payslips'),
  });
};

export const useAllPayroll = (enabled: boolean = true) => {
  return useQuery({
    queryKey: [...queryKeys.payroll.all, 'allRecords'] as const,
    queryFn: () => api.get<(PayrollRecord & { employeeName: string; department: string })[]>('/payroll/all'),
    enabled,
  });
};

export const useEmployeePayroll = (employeeId: string) => {
  return useQuery({
    queryKey: queryKeys.payroll.employee(employeeId),
    queryFn: () => api.get<PayrollRecord[]>(`/payroll/employee/${employeeId}`),
    enabled: !!employeeId,
  });
};

export const usePayrollSummary = (startDate: string, endDate: string) => {
  return useQuery({
    queryKey: queryKeys.payroll.summary({ startDate, endDate }),
    queryFn: () => api.get<PayrollSummary>(`/payroll/reports/summary?startDate=${startDate}&endDate=${endDate}`),
    enabled: !!startDate && !!endDate,
  });
};

export const useSalaryHistory = (employeeId: string) => {
  return useQuery({
    queryKey: queryKeys.payroll.salaryHistory(employeeId),
    queryFn: () => api.get<SalaryHistoryRecord[]>(`/payroll/salary/${employeeId}/history`),
    enabled: !!employeeId,
  });
};

export const useBatchCreatePayroll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { payPeriodStart: string; payPeriodEnd: string }) =>
      api.post<{ created: number; skipped: number; skippedEmployees: string[] }>('/payroll/batch', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.all });
    },
  });
};

export const useCreatePayroll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      employeeId: string;
      payPeriodStart: string;
      payPeriodEnd: string;
      baseSalary: number;
      overtimeHours?: number;
      bonus?: number;
      leaveDeduction?: number;
      deductions?: number;
    }) => api.post<PayrollRecord>('/payroll', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.all });
    },
  });
};

export const useUpdatePayrollStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, paymentMethod }: { id: string; status: string; paymentMethod?: string }) =>
      api.patch<PayrollRecord>(`/payroll/${id}/status`, { status, paymentMethod }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.all });
    },
  });
};

export const useUpdatePayroll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: {
      baseSalary?: number;
      overtimeHours?: number;
      bonus?: number;
      leaveDeduction?: number;
      deductions?: number;
      notes?: string;
    }}) => api.put<PayrollRecord>(`/payroll/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.all });
    },
  });
};

export const useEmailPayslip = () => {
  return useMutation({
    mutationFn: (id: string) => api.post<{ message: string }>(`/payroll/${id}/email-payslip`, {}),
  });
};

export const useUpdateSalary = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, newSalary, changeReason }: { employeeId: string; newSalary: number; changeReason: string }) =>
      api.post<SalaryHistoryRecord>(`/payroll/salary/${employeeId}`, { newSalary, changeReason }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.salaryHistory(vars.employeeId) });
    },
  });
};

// Payroll Settings
export interface PayrollSettings {
  standardHoursPerMonth: number;
  taxBrackets: { min: number; max: number; rate: number }[];
  personalAllowance: number;
  expenseDeduction: number;
  ssfRate: number;
  ssfMaxBase: number;
  pvfEmployeeRate: number;
  pvfEmployerRate: number;
}

export const usePayrollSettings = (enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.systemConfig.payroll(),
    queryFn: async () => {
      const configs = await api.get<{ key: string; value: string; data_type: string }[]>('/configs/payroll');
      const settings: PayrollSettings = {
        standardHoursPerMonth: 160,
        taxBrackets: [],
        personalAllowance: 60000,
        expenseDeduction: 100000,
        ssfRate: 0.05,
        ssfMaxBase: 15000,
        pvfEmployeeRate: 0.03,
        pvfEmployerRate: 0.03,
      };
      for (const c of configs) {
        if (c.key === 'standard_hours_per_month') settings.standardHoursPerMonth = parseFloat(c.value);
        if (c.key === 'tax_brackets') settings.taxBrackets = JSON.parse(c.value);
        if (c.key === 'personal_allowance') settings.personalAllowance = parseFloat(c.value);
        if (c.key === 'expense_deduction') settings.expenseDeduction = parseFloat(c.value);
        if (c.key === 'ssf_rate') settings.ssfRate = parseFloat(c.value);
        if (c.key === 'ssf_max_base') settings.ssfMaxBase = parseFloat(c.value);
        if (c.key === 'pvf_employee_rate') settings.pvfEmployeeRate = parseFloat(c.value);
        if (c.key === 'pvf_employer_rate') settings.pvfEmployerRate = parseFloat(c.value);
      }
      return settings;
    },
    enabled,
  });
};

export const useUpdatePayrollSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: PayrollSettings) => {
      await Promise.all([
        api.put('/configs/payroll/standard_hours_per_month', { value: String(settings.standardHoursPerMonth) } as unknown as Record<string, unknown>),
        api.put('/configs/payroll/tax_brackets', { value: JSON.stringify(settings.taxBrackets) } as unknown as Record<string, unknown>),
        api.put('/configs/payroll/personal_allowance', { value: String(settings.personalAllowance) } as unknown as Record<string, unknown>),
        api.put('/configs/payroll/expense_deduction', { value: String(settings.expenseDeduction) } as unknown as Record<string, unknown>),
        api.put('/configs/payroll/ssf_rate', { value: String(settings.ssfRate) } as unknown as Record<string, unknown>),
        api.put('/configs/payroll/ssf_max_base', { value: String(settings.ssfMaxBase) } as unknown as Record<string, unknown>),
        api.put('/configs/payroll/pvf_employee_rate', { value: String(settings.pvfEmployeeRate) } as unknown as Record<string, unknown>),
        api.put('/configs/payroll/pvf_employer_rate', { value: String(settings.pvfEmployerRate) } as unknown as Record<string, unknown>),
      ]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.systemConfig.payroll() });
    },
  });
};

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------
export interface AnalyticsDashboard {
  headcount: { name: string; value: number }[];
  departments: { name: string; value: number }[];
  attendance: { day: string; onTime: number; late: number; absent: number }[];
  leaveByType: { type: string; requests: number; days: number }[];
  performance: { rating: number; label: string; count: number }[];
  turnover: { name: string; hires: number; departures: number }[];
}

export const useAnalyticsDashboard = (year?: number) => {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard(year),
    queryFn: () => api.get<AnalyticsDashboard>(`/analytics/dashboard${year ? `?year=${year}` : ''}`),
    staleTime: 5 * 60 * 1000,
  });
};

export const useComplianceChecks = () => {
  return useQuery({
    queryKey: queryKeys.compliance.checks(),
    queryFn: () => api.get<ComplianceCheck[]>('/compliance/checks'),
  });
};

export interface PersistentAuditLog {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resource: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string | null;
  statusCode: number;
  duration: number | null;
  success: boolean;
  details: Record<string, unknown> | null;
  createdAt: string;
}

// ============================================================================
// Compliance Items
// ============================================================================

export const useComplianceItems = (filters: { status?: string; category?: string; priority?: string; page?: number; limit?: number } = {}) => {
  return useQuery({
    queryKey: queryKeys.compliance.items(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.category) params.set('category', filters.category);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      return api.get<{ data: ComplianceItem[]; total: number; page: number; totalPages: number }>(`/compliance/items?${params}`);
    },
  });
};

export const useCreateComplianceItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ComplianceItem>) =>
      api.post<ComplianceItem>('/compliance/items', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.compliance.all });
    },
  });
};

export const useUpdateComplianceItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ComplianceItem> }) =>
      api.put<ComplianceItem>(`/compliance/items/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.compliance.all });
    },
  });
};

export const useDeleteComplianceItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/compliance/items/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.compliance.all });
    },
  });
};

export const useUpdateComplianceStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      api.patch<ComplianceItem>(`/compliance/items/${id}/status`, { status, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.compliance.all });
    },
  });
};

// ============================================================================
// Expense Claims
// ============================================================================

export const useExpenseClaims = () => {
  return useQuery({
    queryKey: queryKeys.expenseClaims.list(),
    queryFn: () => api.get<import('../types').ExpenseClaim[]>('/expense-claims'),
    select: (data) => data.map(transformAvatarUrl),
  });
};

export const useExpenseSummary = (employeeId?: string) => {
  return useQuery({
    queryKey: queryKeys.expenseClaims.summary(employeeId || ''),
    queryFn: () => api.get<import('../types').ExpenseSummary>(`/expense-claims/summary/${employeeId}`),
    enabled: !!employeeId,
  });
};

export const useAdminExpenseSummary = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.expenseClaims.adminSummary(),
    queryFn: () => api.get<import('../types').AdminExpenseSummary>('/expense-claims/admin/summary'),
    enabled,
  });
};

export const useCreateExpenseClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const token = getAuthToken();
      const res = await fetch(`${BASE_URL}/expense-claims`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create expense claim');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenseClaims.all });
    },
  });
};

export const useUpdateExpenseClaimStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; status: string; rejectionReason?: string }) => {
      return api.patch(`/expense-claims/${id}`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenseClaims.all });
    },
  });
};

export const useCancelExpenseClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/expense-claims/${id}/cancel`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenseClaims.all });
    },
  });
};

export const useDeleteExpenseClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/expense-claims/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenseClaims.all });
    },
  });
};

export const useComplianceAuditLogs = (filters: { page?: number; limit?: number; resource?: string } = {}) => {
  return useQuery({
    queryKey: queryKeys.compliance.auditLogs(filters as Record<string, unknown>),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', (filters.limit || 15).toString());
      if (filters.resource && filters.resource !== 'All') params.append('resource', filters.resource);
      const qs = params.toString();
      return api.get<PaginatedResponse<PersistentAuditLog>>(
        qs ? `/compliance/audit-logs?${qs}` : '/compliance/audit-logs'
      );
    },
  });
};

export const useAuditLogsFull = (filters: {
  page?: number;
  limit?: number;
  resource?: string;
  action?: string;
  userEmail?: string;
  startDate?: string;
  endDate?: string;
  success?: string;
} = {}) => {
  return useQuery({
    queryKey: queryKeys.compliance.auditLogs(filters as Record<string, unknown>),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page.toString());
      params.append('limit', (filters.limit || 15).toString());
      if (filters.resource && filters.resource !== 'All') params.append('resource', filters.resource);
      if (filters.action) params.append('action', filters.action);
      if (filters.userEmail) params.append('userEmail', filters.userEmail);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.success && filters.success !== 'All') params.append('success', filters.success === 'Success' ? 'true' : 'false');
      return api.get<PaginatedResponse<PersistentAuditLog>>(`/compliance/audit-logs?${params.toString()}`);
    },
  });
};

// ---------------------------------------------------------------------------
// Holidays
// ---------------------------------------------------------------------------

export const useHolidays = () => {
  return useQuery({
    queryKey: queryKeys.holidays.list(),
    queryFn: () => api.get<PublicHoliday[]>('/holidays'),
  });
};

export const useBulkCreateHolidays = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (holidays: { date: string; endDate?: string | null; name: string; isRecurring?: boolean }[]) =>
      api.post<{ created: number; failed: number }>('/holidays/bulk', { holidays }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.holidays.all });
    },
  });
};

export const useCreateHoliday = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; endDate?: string | null; name: string; isRecurring?: boolean }) =>
      api.post<PublicHoliday>('/holidays', data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.holidays.all });
    },
  });
};

export const useUpdateHoliday = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; date?: string; endDate?: string | null; name?: string; isRecurring?: boolean }) =>
      api.put<PublicHoliday>(`/holidays/${id}`, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.holidays.all });
    },
  });
};

export const useDeleteHoliday = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/holidays/${id}`),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.holidays.all });
    },
  });
};

// ---------------------------------------------------------------------------
// Attendance GPS Config
// ---------------------------------------------------------------------------

export interface GPSConfig {
  officeLat: string;
  officeLng: string;
  geofenceRadius: string;
  gpsRequired: string;
  officeIp: string;
}

export const useAttendanceGPSConfig = (enabled = true) =>
  useQuery({
    queryKey: ['configs', 'attendance-gps'],
    enabled,
    queryFn: async () => {
      const configs = await api.get<{ key: string; value: string }[]>('/configs/attendance');
      const map: Record<string, string> = {};
      for (const c of configs) map[c.key] = c.value;
      return {
        officeLat: map['office_lat'] ?? '',
        officeLng: map['office_lng'] ?? '',
        geofenceRadius: map['geofence_radius'] ?? '200',
        gpsRequired: map['gps_required'] ?? 'false',
        officeIp: map['office_ip'] ?? '',
      } as GPSConfig;
    },
  });

export const useUpdateGPSConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: GPSConfig) => {
      await Promise.all([
        api.put('/configs/attendance/office_lat',      { value: config.officeLat } as unknown as Record<string, unknown>),
        api.put('/configs/attendance/office_lng',      { value: config.officeLng } as unknown as Record<string, unknown>),
        api.put('/configs/attendance/geofence_radius', { value: config.geofenceRadius } as unknown as Record<string, unknown>),
        api.put('/configs/attendance/gps_required',    { value: config.gpsRequired } as unknown as Record<string, unknown>),
        api.put('/configs/attendance/office_ip',       { value: config.officeIp } as unknown as Record<string, unknown>),
      ]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configs', 'attendance-gps'] });
    },
  });
};

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export const useAssets = (filters?: { status?: string; search?: string }) => {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString();
  return useQuery({
    queryKey: queryKeys.assets.list(filters as Record<string, unknown>),
    queryFn: () => api.get<CompanyAsset[]>(`/assets${qs ? `?${qs}` : ''}`),
  });
};

export const useCreateAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CompanyAsset>) => api.post<CompanyAsset>('/assets', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.assets.all }); },
  });
};

export const useUpdateAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CompanyAsset> }) => api.patch<CompanyAsset>(`/assets/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.assets.all }); },
  });
};

export const useAssignAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, employeeId }: { id: string; employeeId: string }) => api.post<CompanyAsset>(`/assets/${id}/assign`, { employeeId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.assets.all }); },
  });
};

export const useUnassignAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<CompanyAsset>(`/assets/${id}/unassign`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.assets.all }); },
  });
};

export const useDeleteAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/assets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.assets.all }); },
  });
};
