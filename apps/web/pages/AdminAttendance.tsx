import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  UserCheck,
  Activity,
  LogOut,
  UserX,
  Plus,
  Pencil,
  Trash2,
  Search,
  MoreVertical,
  Download,
  Home,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { AttendanceAnalyticsPanel } from '../components/AttendanceAnalyticsPanel';
import { Avatar } from '../components/Avatar';
import { Dropdown, DropdownOption } from '../components/Dropdown';
import { DatePicker } from '../components/DatePicker';
import { Pagination } from '../components/Pagination';
import { UpsertAttendanceModal } from '../components/UpsertAttendanceModal';
import { LeaveActionBar } from '../components/LeaveActionBar';
import { useToast } from '../contexts/ToastContext';
import {
  useAdminAttendanceSnapshot,
  useAdminAttendanceRecords,
  useAdminUpsertAttendance,
  useAdminDeleteAttendance,
  useAllEmployees,
  useAdminWFHRequests,
  useApproveWFH,
  useRejectWFH,
  useAttendanceAnalytics,
  useHolidays,
} from '../hooks/queries';
import { formatTimeTH, formatDate, dayjs } from '../lib/date';
import type { AdminAttendanceRecord, AdminAttendanceFilters, AdminDisplayStatus, AttendanceStatus } from '../types';

type WFHItem = { id: string; date: string; reason: string | null; status: string; employeeName?: string; employeeDepartment?: string; employeeAvatar?: string | null };

const WFH_STATUS_OPTIONS: DropdownOption[] = [
  { value: 'pending',  label: 'All Pending' },
  { value: 'all',      label: 'All Requests' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const WFH_SORT_OPTIONS: DropdownOption[] = [
  { value: 'date_desc', label: 'Date Requested' },
  { value: 'date_asc',  label: 'Oldest First' },
  { value: 'name_asc',  label: 'Name A–Z' },
];

const ITEMS_PER_PAGE = 20;

/* DEPARTMENTS and STATUS_FILTER_OPTIONS moved inside component for i18n */

const getStatusStyle = (status: AdminDisplayStatus | string): { dot: string; badge: string } => {
  switch (status) {
    case 'Active':
      return { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-800' };
    case 'Checked Out':
      return { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-800' };
    case 'On-Leave':
      return { dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:ring-purple-800' };
    case 'Not In':
      return { dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:ring-orange-800' };
    default:
      return { dot: 'bg-gray-500', badge: 'bg-gray-50 text-gray-700 ring-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:ring-gray-800' };
  }
};

const formatTime = formatTimeTH;

const CHECK_IN_TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
  office:  { label: 'Office',  cls: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  wfh:     { label: 'WFH',     cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  remote:  { label: 'Remote',  cls: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
};

const CheckInTypeBadge: React.FC<{ type?: string }> = ({ type }) => {
  if (!type) return null;
  const config = CHECK_IN_TYPE_CONFIG[type] ?? { label: type, cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded uppercase tracking-wide ${config.cls}`}>
      {config.label}
    </span>
  );
};

const AdminAttendance: React.FC = () => {
  const { t } = useTranslation(['attendance', 'common']);
  const { showToast } = useToast();

  const DEPARTMENTS: DropdownOption[] = [
    { value: 'All', label: t('common:departments.allDepartments') },
    { value: 'Human Resources', label: t('common:departments.humanResources') },
    { value: 'Engineering', label: t('common:departments.engineering') },
    { value: 'Developer', label: t('common:departments.developer') },
    { value: 'Marketing', label: t('common:departments.marketing') },
    { value: 'Sales', label: t('common:departments.sales') },
    { value: 'Finance', label: t('common:departments.finance') },
    { value: 'Operations', label: t('common:departments.operations') },
    { value: 'Product', label: t('common:departments.product') },
    { value: 'Design', label: t('common:departments.design') },
    { value: 'Legal', label: t('common:departments.legal') },
    { value: 'Customer Support', label: t('common:departments.customerSupport') },
    { value: 'Tester', label: t('common:departments.tester') },
  ];

  const STATUS_FILTER_OPTIONS: DropdownOption[] = [
    { value: 'All', label: t('attendance:filters.allStatuses') },
    { value: 'Present', label: t('attendance:filters.presentToday') },
    { value: 'Active', label: t('attendance:filters.activeNow') },
    { value: 'Checked Out', label: t('attendance:filters.checkedOut') },
    { value: 'Not In', label: t('attendance:filters.notInOnLeave') },
  ];

  // Main tab
  const [mainTab, setMainTab] = useState<'records' | 'wfh'>('records');

  // WFH filters
  const [wfhStatusFilter, setWfhStatusFilter] = useState<string>('pending');
  const [wfhSearch, setWfhSearch] = useState('');
  const [wfhSort, setWfhSort] = useState<string>('date_desc');

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [status, setStatus] = useState('All');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AdminAttendanceRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [department, status, selectedDate]);

  const filters: AdminAttendanceFilters = {
    search: debouncedSearch || undefined,
    department: department !== 'All' ? department : undefined,
    status: status !== 'All' ? status : undefined,
    startDate: selectedDate,
    endDate: selectedDate,
    page,
    limit: ITEMS_PER_PAGE,
  };

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isToday = selectedDate === todayStr;
  const recordsRef = useRef<HTMLDivElement>(null);
  const { data: analyticsData } = useAttendanceAnalytics(7);
  const { data: holidays = [] } = useHolidays();

  // Queries
  const { data: snapshot } = useAdminAttendanceSnapshot();
  const { data: recordsResponse, isPending: loading } = useAdminAttendanceRecords(filters, { refetchInterval: isToday ? 60_000 : false });
  const { data: allEmployees = [] } = useAllEmployees();
  const upsertMutation = useAdminUpsertAttendance();
  const deleteMutation = useAdminDeleteAttendance();
  const { data: wfhRequests = [], isPending: wfhLoading } = useAdminWFHRequests();
  const approveMutation = useApproveWFH();
  const rejectMutation = useRejectWFH();
  const [wfhActionId, setWfhActionId] = useState<string | null>(null);

  const records = recordsResponse?.data || [];
  const totalPages = recordsResponse?.totalPages || 1;
  const totalItems = recordsResponse?.total || 0;

  const handleOpenAdd = useCallback(() => {
    setEditingRecord(null);
    setIsModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((record: AdminAttendanceRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingRecord(null);
  }, []);

  const handleSubmit = useCallback(
    (data: {
      employeeId: string;
      date: string;
      clockIn?: string;
      clockOut?: string;
      status?: AttendanceStatus;
      notes?: string;
    }) => {
      upsertMutation.mutate(data, {
        onSuccess: () => {
          showToast(editingRecord ? t('attendance:admin.recordUpdated') : t('attendance:admin.recordAdded'), 'success');
          handleCloseModal();
        },
        onError: (error) => {
          showToast(error instanceof Error ? error.message : t(editingRecord ? 'attendance:admin.failedUpdate' : 'attendance:admin.failedAdd'), 'error');
        },
      });
    },
    [upsertMutation, editingRecord, showToast, handleCloseModal],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          showToast(t('attendance:admin.recordDeleted'), 'success');
          setDeleteConfirmId(null);
        },
        onError: (error) => {
          showToast(error instanceof Error ? error.message : t('attendance:admin.failedDelete'), 'error');
        },
      });
    },
    [deleteMutation, showToast],
  );

  const handleCardClick = useCallback((filterValue: string) => {
    setStatus(filterValue);
    setTimeout(() => recordsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, []);

  const allWFH = useMemo(() => wfhRequests as WFHItem[], [wfhRequests]);

  const wfhStats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    return allWFH.reduce(
      (acc, r) => {
        if (r.status === 'pending') { acc.pending++; return acc; }
        const d = new Date(r.date);
        if (d.getMonth() !== thisMonth || d.getFullYear() !== thisYear) return acc;
        if (r.status === 'approved') acc.approvedThisMonth++;
        else if (r.status === 'rejected') acc.rejectedThisMonth++;
        return acc;
      },
      { pending: 0, approvedThisMonth: 0, rejectedThisMonth: 0 }
    );
  }, [allWFH]);

  const filteredWFH = useMemo(() => allWFH
    .filter(r => {
      if (wfhStatusFilter !== 'all' && r.status !== wfhStatusFilter) return false;
      if (wfhSearch && !r.employeeName?.toLowerCase().includes(wfhSearch.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (wfhSort === 'date_asc') return a.date.localeCompare(b.date);
      if (wfhSort === 'name_asc') return (a.employeeName ?? '').localeCompare(b.employeeName ?? '');
      return b.date.localeCompare(a.date);
    }), [allWFH, wfhStatusFilter, wfhSearch, wfhSort]);

  const handleWFHApprove = useCallback((id: string) => {
    setWfhActionId(id);
    approveMutation.mutate(id, {
      onSuccess: () => showToast('Approved', 'success'),
      onError: () => showToast('Failed to approve', 'error'),
      onSettled: () => setWfhActionId(null),
    });
  }, [approveMutation, showToast]);

  const handleWFHReject = useCallback((id: string) => {
    setWfhActionId(id);
    rejectMutation.mutate(id, {
      onSuccess: () => showToast('Rejected', 'success'),
      onError: () => showToast('Failed to reject', 'error'),
      onSettled: () => setWfhActionId(null),
    });
  }, [rejectMutation, showToast]);

  const exportToCSV = useCallback(() => {
    if (records.length === 0) {
      showToast(t('attendance:admin.noRecordsExport'), 'error');
      return;
    }

    const headers = [t('attendance:admin.csvEmployee'), t('attendance:admin.csvDepartment'), t('attendance:admin.csvCheckIn'), t('attendance:admin.csvCheckOut'), t('attendance:admin.csvHours'), t('attendance:admin.csvOvertime'), t('attendance:admin.csvAutoCheckout'), t('attendance:admin.csvStatus')];
    const rows = records.map((r) => [
      r.employeeName,
      r.employeeDepartment,
      r.clockIn ? formatTime(r.clockIn) : '-',
      r.clockOut ? formatTime(r.clockOut) : '-',
      r.totalHours != null ? Number(r.totalHours).toFixed(1) : '-',
      r.overtimeHours != null && r.overtimeHours > 0 ? Number(r.overtimeHours).toFixed(1) : '0',
      r.autoCheckout ? t('attendance:admin.yes') : t('attendance:admin.no'),
      r.displayStatus || r.status,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [records, selectedDate, showToast]);

  const displayStatus = (record: AdminAttendanceRecord): string =>
    record.displayStatus || record.status;

  const statusKeyMap: Record<string, string> = {
    'Active': 'active',
    'Checked Out': 'checkedOut',
    'On-Leave': 'onLeave',
    'Not In': 'notIn',
    'Late': 'late',
    'Present': 'present',
    'Absent': 'absent',
  };
  const translateStatus = (ds: string): string =>
    t(`common:status.${statusKeyMap[ds] || ds}`, { defaultValue: ds });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">
            {t('attendance:admin.title')}
          </h1>
          <p className="text-sm sm:text-base text-text-muted-light dark:text-text-muted-dark mt-1">
            {t('attendance:admin.subtitle')}
          </p>
        </div>
        {mainTab === 'records' && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium shadow-sm"
          >
            <Plus size={18} />
            <span>{t('attendance:admin.addRecord')}</span>
          </button>
        )}
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-border-light dark:border-border-dark">
        <button
          onClick={() => setMainTab('records')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            mainTab === 'records'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark'
          }`}
        >
          {t('attendance:admin.title')}
        </button>
        <button
          onClick={() => setMainTab('wfh')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            mainTab === 'wfh'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark'
          }`}
        >
          <Home size={14} />
          WFH Requests
          {wfhStats.pending > 0 && mainTab !== 'wfh' && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
              {wfhStats.pending}
            </span>
          )}
        </button>
      </div>

      {mainTab === 'wfh' && (
          <div className="space-y-5">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {[
                { label: 'Pending Requests', mobileLabel: 'Pending', value: wfhStats.pending, subtitle: 'Awaiting review', icon: <Clock size={20} />, iconColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', filter: 'pending' },
                { label: 'Approved This Month', mobileLabel: 'Approved', value: wfhStats.approvedThisMonth, subtitle: 'WFH days approved', icon: <CheckCircle2 size={20} />, iconColor: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400', filter: 'approved' },
                { label: 'Rejected This Month', mobileLabel: 'Rejected', value: wfhStats.rejectedThisMonth, subtitle: 'WFH days rejected', icon: <XCircle size={20} />, iconColor: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400', filter: 'rejected' },
              ].map(({ label, mobileLabel, value, subtitle, icon, iconColor, filter }) => (
                <button
                  key={filter}
                  onClick={() => setWfhStatusFilter(wfhStatusFilter === filter ? 'all' : filter)}
                  className={`p-3 sm:p-4 rounded-xl transition-all text-left w-full cursor-pointer border ${
                    wfhStatusFilter === filter
                      ? 'bg-primary/5 dark:bg-primary/10 border-primary/40 shadow-sm'
                      : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col items-start gap-1.5 sm:hidden">
                    <div className={`p-1.5 rounded-lg ${iconColor}`}>{icon}</div>
                    <p className="text-2xl font-bold text-text-light dark:text-text-dark leading-none">{value}</p>
                    <p className="text-xs font-medium text-text-muted-light dark:text-text-muted-dark">{mobileLabel}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${iconColor}`}>{icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-muted-light dark:text-text-muted-dark truncate">{label}</p>
                      <p className="text-xl font-bold text-text-light dark:text-text-dark">{value}</p>
                      <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{subtitle}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Table Card */}
            <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm overflow-hidden">
              {/* Toolbar */}
              <div className="p-4 border-b border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-gray-800/20 flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark" size={16} />
                  <input
                    type="text"
                    value={wfhSearch}
                    onChange={(e) => setWfhSearch(e.target.value)}
                    placeholder="Search employee..."
                    className="pl-9 pr-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all w-full"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Dropdown options={WFH_STATUS_OPTIONS} value={wfhStatusFilter} onChange={setWfhStatusFilter} width="flex-1 md:w-auto" />
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden md:inline text-sm font-medium text-text-muted-light dark:text-text-muted-dark whitespace-nowrap">Sort by:</span>
                    <Dropdown options={WFH_SORT_OPTIONS} value={wfhSort} onChange={setWfhSort} width="w-auto" />
                  </div>
                </div>
              </div>

              {/* Desktop Table */}
              {wfhLoading ? (
                <div className="flex items-center justify-center h-32 text-text-muted-light dark:text-text-muted-dark text-sm">Loading...</div>
              ) : filteredWFH.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-text-muted-light dark:text-text-muted-dark">
                  <Home size={24} />
                  <p className="text-sm">No WFH requests found</p>
                </div>
              ) : (
                <>
                  {/* Desktop */}
                  <div className="overflow-x-auto hidden md:block">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-800 border-b border-border-light dark:border-border-dark">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Employee</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Reason</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-light dark:divide-border-dark">
                        {filteredWFH.map((req) => (
                          <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <Avatar src={req.employeeAvatar ?? null} name={req.employeeName ?? '?'} size="lg" />
                                <div>
                                  <p className="text-sm font-medium text-text-light dark:text-text-dark">{req.employeeName ?? '—'}</p>
                                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{req.employeeDepartment}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-sm text-text-light dark:text-text-dark">{formatDate(req.date)}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-text-light dark:text-text-dark truncate max-w-xs">{req.reason || <span className="text-text-muted-light dark:text-text-muted-dark">—</span>}</p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {req.status === 'pending' ? (
                                  <LeaveActionBar
                                    employeeName={req.employeeName}
                                    compact
                                    disabled={wfhActionId === req.id}
                                    onApprove={() => handleWFHApprove(req.id)}
                                    onReject={() => handleWFHReject(req.id)}
                                  />
                                ) : (
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
                                    req.status === 'approved'
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200'
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200'
                                  }`}>
                                    {req.status === 'approved' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y divide-border-light dark:divide-border-dark">
                    {filteredWFH.map((req) => (
                      <div key={req.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar src={req.employeeAvatar ?? null} name={req.employeeName ?? '?'} size="lg" />
                            <div>
                              <p className="text-sm font-medium text-text-light dark:text-text-dark">{req.employeeName ?? '—'}</p>
                              <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{req.employeeDepartment}</p>
                            </div>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                            req.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                            : req.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <div className="text-sm text-text-muted-light dark:text-text-muted-dark space-y-0.5">
                          <p><span className="font-medium">Date:</span> {formatDate(req.date)}</p>
                          {req.reason && <p><span className="font-medium">Reason:</span> {req.reason}</p>}
                        </div>
                        {req.status === 'pending' && (
                          <LeaveActionBar
                            employeeName={req.employeeName}
                            compact
                            disabled={wfhActionId === req.id}
                            onApprove={() => handleWFHApprove(req.id)}
                            onReject={() => handleWFHReject(req.id)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
      )}

      {mainTab === 'records' && <>
      {/* Snapshot Cards — click to filter */}
      {snapshot && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <SnapshotCard
            icon={<Users size={20} />}
            label={t('attendance:admin.totalEmployees')}
            value={snapshot.total}
            iconColor="bg-slate-100 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400"
            filterValue="All"
            activeFilter={status}
            onClick={handleCardClick}
          />
          <SnapshotCard
            icon={<UserCheck size={20} />}
            label={t('attendance:admin.presentToday')}
            value={snapshot.presentToday}
            iconColor="bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400"
            filterValue="Present"
            activeFilter={status}
            onClick={handleCardClick}
            subtitle={snapshot.total > 0 ? `${Math.round((snapshot.presentToday / snapshot.total) * 100)}% attendance` : undefined}
          />
          <SnapshotCard
            icon={<Activity size={20} />}
            label={t('attendance:admin.activeNow')}
            value={snapshot.activeNow}
            iconColor="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
            filterValue="Active"
            activeFilter={status}
            onClick={handleCardClick}
          />
          <SnapshotCard
            icon={<LogOut size={20} />}
            label={t('attendance:admin.checkedOut')}
            value={snapshot.checkedOut}
            iconColor="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            filterValue="Checked Out"
            activeFilter={status}
            onClick={handleCardClick}
          />
          <SnapshotCard
            icon={<UserX size={20} />}
            label={t('attendance:admin.notInOnLeave')}
            value={snapshot.absentOrLeave}
            iconColor="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
            filterValue="Not In"
            activeFilter={status}
            onClick={handleCardClick}
          />
        </div>
      )}

      {/* Analytics Panel */}
      {analyticsData && (
        <AttendanceAnalyticsPanel data={analyticsData} holidays={holidays} />
      )}

      {/* Records Table */}
      <div ref={recordsRef} className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm overflow-hidden">
        {/* Toolbar: Search + Filters | Date + Export */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-6 py-4 border-b border-border-light dark:border-border-dark">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative sm:w-56">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('attendance:admin.searchEmployee')}
                className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <Dropdown
              options={DEPARTMENTS}
              value={department}
              onChange={setDepartment}
              width="w-full sm:w-40"
            />
            <Dropdown
              options={STATUS_FILTER_OPTIONS}
              value={status}
              onChange={setStatus}
              width="w-full sm:w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <DatePicker value={selectedDate} onChange={setSelectedDate} placeholder={t('attendance:admin.selectDate')} />
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium shadow-sm whitespace-nowrap"
            >
              <Download size={16} />
              <span>{t('common:buttons.export')}</span>
            </button>
          </div>
        </div>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-border-light dark:border-border-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  {t('attendance:admin.employee')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  {t('attendance:admin.department')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  {t('attendance:admin.checkIn')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  {t('attendance:admin.checkOut')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  {t('attendance:admin.hours')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  {t('attendance:admin.ot')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  {t('attendance:admin.status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  {t('attendance:admin.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-text-muted-light dark:text-text-muted-dark">
                    {t('attendance:admin.loading')}
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-text-muted-light dark:text-text-muted-dark">
                    {t('attendance:admin.noRecords')}
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          {record.employeeAvatar ? (
                            <img
                              src={record.employeeAvatar}
                              alt={record.employeeName}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                              {record.employeeName.charAt(0)}
                            </div>
                          )}
                          {record.status === 'Late' && record.clockIn && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-orange-500 ring-2 ring-card-light dark:ring-card-dark" title="Late" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-text-light dark:text-text-dark">
                          {record.employeeName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted-light dark:text-text-muted-dark">
                      {record.employeeDepartment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                      {formatTime(record.clockIn)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                      {formatTime(record.clockOut)}
                      {record.autoCheckout && (
                        <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">({t('common:auto')})</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                      {record.totalHours != null ? `${Number(record.totalHours).toFixed(1)}h` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {record.overtimeHours != null && record.overtimeHours > 0
                        ? <span className="text-amber-600 dark:text-amber-400 font-medium">{Number(record.overtimeHours).toFixed(1)}h</span>
                        : <span className="text-text-muted-light dark:text-text-muted-dark">-</span>}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {record.clockIn
                        ? <CheckInTypeBadge type={record.checkInType ?? 'office'} />
                        : <span className="text-text-muted-light dark:text-text-muted-dark">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const ds = displayStatus(record);
                          const s = getStatusStyle(ds);
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ring-1 ring-inset ${s.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                              {translateStatus(ds)}
                            </span>
                          );
                        })()}
                        {record.earlyDeparture && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">{t('common:status.early')}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionMenuId(actionMenuId === record.id ? null : record.id)}
                          className="p-1.5 text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {actionMenuId === record.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 w-36 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg z-20 py-1">
                              <button
                                onClick={() => { handleOpenEdit(record); setActionMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              >
                                <Pencil size={14} />
                                {t('common:buttons.edit')}
                              </button>
                              {deleteConfirmId === record.id ? (
                                <div className="flex items-center gap-1 px-3 py-2">
                                  <button
                                    onClick={() => handleDelete(record.id)}
                                    className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
                                  >
                                    {t('common:buttons.confirm')}
                                  </button>
                                  <button
                                    onClick={() => { setDeleteConfirmId(null); setActionMenuId(null); }}
                                    className="px-2 py-1 text-xs font-medium text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors"
                                  >
                                    {t('common:buttons.cancel')}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(record.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                  <Trash2 size={14} />
                                  {t('common:buttons.delete')}
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-4">
          {loading ? (
            <div className="py-8 text-center text-text-muted-light dark:text-text-muted-dark">
              {t('attendance:admin.loading')}
            </div>
          ) : records.length === 0 ? (
            <div className="py-8 text-center text-text-muted-light dark:text-text-muted-dark">
              {t('attendance:admin.noRecords')}
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="p-4 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="relative shrink-0">
                        {record.employeeAvatar ? (
                          <img
                            src={record.employeeAvatar}
                            alt={record.employeeName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                            {record.employeeName.charAt(0)}
                          </div>
                        )}
                        {record.status === 'Late' && record.clockIn && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-orange-500 ring-2 ring-card-light dark:ring-card-dark" title="Late" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-light dark:text-text-dark">
                          {record.employeeName}
                        </p>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
                          {record.employeeDepartment}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {(() => {
                        const ds = displayStatus(record);
                        const s = getStatusStyle(ds);
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full ring-1 ring-inset ${s.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                            {translateStatus(ds)}
                          </span>
                        );
                      })()}
                      {record.autoCheckout && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">{t('common:auto')}</span>
                      )}
                      {record.earlyDeparture && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">{t('common:status.early')}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                    <div>
                      <p className="text-text-muted-light dark:text-text-muted-dark">{t('attendance:admin.checkIn')}</p>
                      <p className="font-medium text-text-light dark:text-text-dark">{formatTime(record.clockIn)}</p>
                      {record.clockIn && <CheckInTypeBadge type={record.checkInType ?? 'office'} />}
                    </div>
                    <div>
                      <p className="text-text-muted-light dark:text-text-muted-dark">{t('attendance:admin.checkOut')}</p>
                      <p className="font-medium text-text-light dark:text-text-dark">{formatTime(record.clockOut)}</p>
                    </div>
                    <div>
                      <p className="text-text-muted-light dark:text-text-muted-dark">{t('attendance:admin.hours')}</p>
                      <p className="font-medium text-text-light dark:text-text-dark">{record.totalHours != null ? `${Number(record.totalHours).toFixed(1)}h` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-text-muted-light dark:text-text-muted-dark">{t('attendance:admin.ot')}</p>
                      <p className="font-medium text-amber-600 dark:text-amber-400">
                        {record.overtimeHours != null && record.overtimeHours > 0 ? `${Number(record.overtimeHours).toFixed(1)}h` : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border-light dark:border-border-dark">
                    <button
                      onClick={() => handleOpenEdit(record)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      <Pencil size={14} />
                      {t('common:buttons.edit')}
                    </button>
                    {deleteConfirmId === record.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                        >
                          {t('attendance:admin.confirmDelete')}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1.5 text-xs font-medium text-text-muted-light dark:text-text-muted-dark transition-colors"
                        >
                          {t('common:buttons.cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(record.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                        {t('common:buttons.delete')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border-light dark:border-border-dark">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={totalItems}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </div>
        )}
      </div>

      </>}

      {/* Upsert Modal */}
      <UpsertAttendanceModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        employees={allEmployees}
        editingRecord={editingRecord}
        isPending={upsertMutation.isPending}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Snapshot Card sub-component
// ---------------------------------------------------------------------------

interface SnapshotCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  iconColor: string;
  subtitle?: string;
  filterValue: string;
  activeFilter: string;
  onClick: (filterValue: string) => void;
}

const SnapshotCard: React.FC<SnapshotCardProps> = ({ icon, label, value, iconColor, subtitle, filterValue, activeFilter, onClick }) => {
  const isActive = activeFilter === filterValue;
  return (
    <button
      onClick={() => onClick(filterValue)}
      className={`p-4 rounded-xl transition-all text-left w-full cursor-pointer border ${
        isActive
          ? 'bg-primary/5 dark:bg-primary/10 border-primary/40 shadow-sm'
          : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconColor}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-muted-light dark:text-text-muted-dark truncate">{label}</p>
          <p className="text-xl font-bold text-text-light dark:text-text-dark">{value}</p>
          {subtitle && (
            <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </button>
  );
};

export default AdminAttendance;
