export const queryKeys = {
  employees: {
    all: ['employees'] as const,
    lists: () => [...queryKeys.employees.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.employees.lists(), filters] as const,
    details: () => [...queryKeys.employees.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.employees.details(), id] as const,
  },
  leaveRequests: {
    all: ['leaveRequests'] as const,
    list: () => [...queryKeys.leaveRequests.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.leaveRequests.all, 'detail', id] as const,
  },
  leaveBalances: {
    all: ['leaveBalances'] as const,
    byEmployee: (id: string) => [...queryKeys.leaveBalances.all, id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
  },
  orgChart: {
    all: ['orgChart'] as const,
    tree: () => [...queryKeys.orgChart.all, 'tree'] as const,
    subtree: (id: string) => [...queryKeys.orgChart.all, 'subtree', id] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    employeeStats: () => [...queryKeys.dashboard.all, 'employeeStats'] as const,
    teamHierarchy: () => [...queryKeys.dashboard.all, 'teamHierarchy'] as const,
    adminStats: () => [...queryKeys.dashboard.all, 'adminStats'] as const,
  },
  attendance: {
    all: ['attendance'] as const,
    today: () => [...queryKeys.attendance.all, 'today'] as const,
    employee: (id: string, params: Record<string, unknown>) => [...queryKeys.attendance.all, 'employee', id, params] as const,
    summary: (id: string, params: Record<string, unknown>) => [...queryKeys.attendance.all, 'summary', id, params] as const,
  },
  auditLogs: {
    all: ['auditLogs'] as const,
    list: () => [...queryKeys.auditLogs.all, 'list'] as const,
  },
  headcount: {
    all: ['headcount'] as const,
    stats: () => [...queryKeys.headcount.all, 'stats'] as const,
  },
  events: {
    all: ['events'] as const,
    list: () => [...queryKeys.events.all, 'list'] as const,
  },
  announcements: {
    all: ['announcements'] as const,
    list: () => [...queryKeys.announcements.all, 'list'] as const,
  },
  notes: {
    all: ['notes'] as const,
    list: () => [...queryKeys.notes.all, 'list'] as const,
  },
  documents: {
    all: ['documents'] as const,
    lists: () => [...queryKeys.documents.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.documents.lists(), filters] as const,
    trash: () => [...queryKeys.documents.all, 'trash'] as const,
    storage: () => [...queryKeys.documents.all, 'storage'] as const,
  },
  onboarding: {
    all: ['onboarding'] as const,
    tasks: () => [...queryKeys.onboarding.all, 'tasks'] as const,
    contacts: () => [...queryKeys.onboarding.all, 'contacts'] as const,
    documents: () => [...queryKeys.onboarding.all, 'documents'] as const,
  },
  performanceReviews: {
    all: ['performanceReviews'] as const,
    byEmployee: (id: string) => [...queryKeys.performanceReviews.all, id] as const,
    list: (filters?: Record<string, string>) => [...queryKeys.performanceReviews.all, 'list', filters] as const,
    peerFeedback: (reviewId: string) => [...queryKeys.performanceReviews.all, 'peer-feedback', reviewId] as const,
  },
  teamCalendar: {
    all: ['teamCalendar'] as const,
    byMonth: (month: string, dept?: string) => [...queryKeys.teamCalendar.all, month, dept] as const,
  },
  jobHistory: {
    all: ['jobHistory'] as const,
    byEmployee: (id: string) => [...queryKeys.jobHistory.all, id] as const,
  },
  training: {
    all: ['training'] as const,
    modules: () => [...queryKeys.training.all, 'modules'] as const,
    module: (id: string) => [...queryKeys.training.all, 'module', id] as const,
    byEmployee: (id: string) => [...queryKeys.training.all, 'employee', id] as const,
    analytics: () => [...queryKeys.training.all, 'analytics'] as const,
  },
  employeeDocuments: {
    all: ['employeeDocuments'] as const,
    byEmployee: (id: string) => [...queryKeys.employeeDocuments.all, id] as const,
  },
  employeeManager: {
    all: ['employeeManager'] as const,
    byEmployee: (id: string) => [...queryKeys.employeeManager.all, id] as const,
  },
  employeeDirectReports: {
    all: ['employeeDirectReports'] as const,
    byEmployee: (id: string) => [...queryKeys.employeeDirectReports.all, id] as const,
  },
  adminAttendance: {
    all: ['adminAttendance'] as const,
    snapshot: () => [...queryKeys.adminAttendance.all, 'snapshot'] as const,
    records: (filters: Record<string, unknown>) => [...queryKeys.adminAttendance.all, 'records', filters] as const,
  },
  surveys: {
    all: ['surveys'] as const,
    list: () => [...queryKeys.surveys.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.surveys.all, 'detail', id] as const,
    sentiment: () => [...queryKeys.surveys.all, 'sentiment'] as const,
  },
  leaveQuotas: {
    all: ['leaveQuotas'] as const,
    byEmployee: (id: string) => [...queryKeys.leaveQuotas.all, id] as const,
  },
  systemConfig: {
    all: ['systemConfig'] as const,
    leaveQuotas: () => [...queryKeys.systemConfig.all, 'leaveQuotas'] as const,
    payroll: () => [...queryKeys.systemConfig.all, 'payroll'] as const,
  },
  payroll: {
    all: ['payroll'] as const,
    myPayslips: () => [...queryKeys.payroll.all, 'myPayslips'] as const,
    employee: (id: string) => [...queryKeys.payroll.all, 'employee', id] as const,
    detail: (id: string) => [...queryKeys.payroll.all, 'detail', id] as const,
    summary: (params: Record<string, unknown>) => [...queryKeys.payroll.all, 'summary', params] as const,
    salaryHistory: (id: string) => [...queryKeys.payroll.all, 'salaryHistory', id] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    dashboard: (year?: number) => [...queryKeys.analytics.all, 'dashboard', year] as const,
  },
  compliance: {
    all: ['compliance'] as const,
    checks: () => [...queryKeys.compliance.all, 'checks'] as const,
    auditLogs: (filters: Record<string, unknown>) => [...queryKeys.compliance.all, 'auditLogs', filters] as const,
    items: (filters?: Record<string, unknown>) => [...queryKeys.compliance.all, 'items', filters] as const,
    item: (id: string) => [...queryKeys.compliance.all, 'item', id] as const,
  },
  expenseClaims: {
    all: ['expenseClaims'] as const,
    list: () => ['expenseClaims', 'list'] as const,
    summary: (id: string) => ['expenseClaims', 'summary', id] as const,
    adminSummary: () => ['expenseClaims', 'adminSummary'] as const,
    managerQueue: () => ['expenseClaims', 'managerQueue'] as const,
  },
  wfhRequests: {
    all: ['wfhRequests'] as const,
    my: () => ['wfhRequests', 'my'] as const,
    admin: (filters?: Record<string, unknown>) => ['wfhRequests', 'admin', filters] as const,
  },
  userStatuses: {
    all: ['userStatuses'] as const,
    list: () => ['userStatuses', 'list'] as const,
  },
  holidays: {
    all: ['holidays'] as const,
    list: () => [...queryKeys.holidays.all, 'list'] as const,
  },
  assets: {
    all: ['assets'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.assets.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.assets.all, 'detail', id] as const,
  },
  shifts: {
    all: ['shifts'] as const,
    templates: () => [...queryKeys.shifts.all, 'templates'] as const,
    schedule: (filters: Record<string, unknown>) => [...queryKeys.shifts.all, 'schedule', filters] as const,
    mySchedule: (filters: Record<string, unknown>) => [...queryKeys.shifts.all, 'my', filters] as const,
  },
  offboarding: {
    all: ['offboarding'] as const,
    byEmployee: (id: string) => [...queryKeys.offboarding.all, 'employee', id] as const,
    exitInterview: (id: string) => [...queryKeys.offboarding.all, 'exit-interview', id] as const,
  },
} as const;
