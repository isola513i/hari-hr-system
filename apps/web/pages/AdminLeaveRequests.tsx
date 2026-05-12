import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle2, XCircle, Search, Download } from 'lucide-react';
import {
  useLeaveRequests,
  useUpdateLeaveStatus,
  useHandleCancelDecision,
  useAllEmployees,
  useLeaveTypeConfig,
} from '../hooks/queries';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Avatar } from '../components/Avatar';
import { Pagination } from '../components/Pagination';
import { Dropdown } from '../components/Dropdown';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LeaveDetailModal } from '../components/LeaveDetailModal';
import { LeaveActionBar } from '../components/LeaveActionBar';
import { FilterToolbar } from '../components/FilterToolbar';
import type { LeaveRequest } from '../types';
import { DEPARTMENTS } from '../types';
import { buildLeaveColorMap, buildLeaveFilterOptions, translateLeaveType } from '../lib/leaveTypeConfig';

const ITEMS_PER_PAGE = 10;

// STATUS_OPTIONS and SORT_OPTIONS are defined inside the component to access translations

export const AdminLeaveRequests: React.FC = () => {
  const { t } = useTranslation(['leave', 'common']);
  const { showToast } = useToast();
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';

  const STATUS_OPTIONS = useMemo(
    () => [
      { value: 'Pending', label: t('leave:admin.allPending') },
      { value: 'Manager Approved', label: 'Pending HR' },
      { value: 'All', label: t('leave:admin.allRequests') },
      { value: 'Approved', label: t('leave:admin.approved') },
      { value: 'Rejected', label: t('leave:admin.rejected') },
      { value: 'Cancel Requested', label: t('leave:admin.cancelRequested') },
    ],
    [t]
  );

  const SORT_OPTIONS = useMemo(
    () => [
      { value: 'date_desc', label: t('leave:admin.sortDateRequested') },
      { value: 'date_asc', label: t('leave:admin.sortOldestFirst') },
      { value: 'name_asc', label: t('leave:admin.sortNameAZ') },
    ],
    [t]
  );

  const [statusFilter, setStatusFilter] = useState(() => isManager ? 'Pending' : 'Manager Approved');
  const [typeFilter, setTypeFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('date_desc');
  const [detailRequest, setDetailRequest] = useState<LeaveRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');

  const { data: leaveRequests = [], isPending: isLoadingRequests } = useLeaveRequests();
  const { data: employees = [], isPending: isLoadingEmployees } = useAllEmployees();
  const { data: leaveConfigs = [] } = useLeaveTypeConfig();
  const LEAVE_TYPE_COLORS = useMemo(() => {
    const colorMap = buildLeaveColorMap(leaveConfigs);
    const result: Record<string, string> = {};
    for (const [type, colors] of Object.entries(colorMap)) {
      result[type] = colors.badge;
    }
    return result;
  }, [leaveConfigs]);
  const LEAVE_TYPE_OPTIONS = useMemo(() => buildLeaveFilterOptions(leaveConfigs), [leaveConfigs]);
  const updateLeaveStatusMutation = useUpdateLeaveStatus();
  const handleCancelDecisionMutation = useHandleCancelDecision();

  // Build employee lookup
  const employeeMap = useMemo(() => {
    const map = new Map<string, { name: string; department: string; avatar: string | null }>();
    for (const e of employees) {
      map.set(e.id, { name: e.name, department: e.department, avatar: e.avatar });
    }
    return map;
  }, [employees]);

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const pending = leaveRequests.filter((r) => r.status === 'Pending').length;
    const cancelRequested = leaveRequests.filter((r) => r.status === 'Cancel Requested').length;

    const approvedThisMonth = leaveRequests.filter((r) => {
      if (r.status !== 'Approved') return false;
      const d = new Date(r.updatedAt || r.startDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const rejectedThisMonth = leaveRequests.filter((r) => {
      if (r.status !== 'Rejected') return false;
      const d = new Date(r.updatedAt || r.startDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const totalDecided = approvedThisMonth + rejectedThisMonth;
    const approvalRate =
      totalDecided > 0 ? Math.round((approvedThisMonth / totalDecided) * 100) : 0;
    const rejectionRate =
      totalDecided > 0 ? Math.round((rejectedThisMonth / totalDecided) * 100) : 0;
    const pendingTotal = pending + cancelRequested;
    const pendingRate =
      leaveRequests.length > 0 ? Math.round((pendingTotal / leaveRequests.length) * 100) : 0;

    return {
      pending: pendingTotal,
      approvedThisMonth,
      rejectedThisMonth,
      approvalRate,
      rejectionRate,
      pendingRate,
    };
  }, [leaveRequests]);

  // Filter & sort requests
  const filteredRequests = useMemo(() => {
    const filtered = leaveRequests.filter((request) => {
      if (statusFilter !== 'All' && request.status !== statusFilter) return false;
      if (typeFilter !== 'All' && request.type !== typeFilter) return false;
      if (departmentFilter !== 'All') {
        const emp = employeeMap.get(request.employeeId);
        if (emp?.department !== departmentFilter) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = (request.employeeName || employeeMap.get(request.employeeId)?.name || '').toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return (a.startDate ?? '').localeCompare(b.startDate ?? '');
        case 'name_asc':
          return (a.employeeName ?? '').localeCompare(b.employeeName ?? '');
        default: // date_desc
          return (b.startDate ?? '').localeCompare(a.startDate ?? '');
      }
    });
  }, [leaveRequests, employeeMap, statusFilter, typeFilter, departmentFilter, sortBy, searchQuery]);

  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRequests.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRequests, currentPage]);

  // Reset page on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, departmentFilter, sortBy, searchQuery]);

  const handleApprove = async (id: string) => {
    try {
      await updateLeaveStatusMutation.mutateAsync({ id, status: 'Approved' });
      showToast(t('leave:admin.requestApproved'), 'success');
    } catch {
      showToast(t('leave:admin.cancelFailed'), 'error');
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      await updateLeaveStatusMutation.mutateAsync({
        id,
        status: 'Rejected',
        rejectionReason: reason,
      });
      showToast(t('leave:admin.requestRejected'), 'success');
    } catch {
      showToast(t('leave:admin.cancelFailed'), 'error');
    }
  };

  const handleCancelDecision = async (
    request: LeaveRequest,
    decision: 'approve_cancel' | 'reject_cancel'
  ) => {
    try {
      await handleCancelDecisionMutation.mutateAsync({ id: request.id, decision });
      showToast(
        decision === 'approve_cancel'
          ? t('leave:admin.cancelApproved')
          : t('leave:admin.cancelRejected'),
        'success'
      );
    } catch {
      showToast(t('leave:admin.cancelFailed'), 'error');
    }
  };

  // Bulk approve
  const handleBulkApprove = async () => {
    let succeeded = 0;
    for (const id of selectedIds) {
      try {
        await updateLeaveStatusMutation.mutateAsync({ id, status: 'Approved' });
        succeeded++;
      } catch { /* skip failed */ }
    }
    showToast(t('leave:admin.bulkSuccess', { count: succeeded }), 'success');
    setSelectedIds(new Set());
  };

  // Bulk reject
  const handleBulkReject = async () => {
    let succeeded = 0;
    for (const id of selectedIds) {
      try {
        await updateLeaveStatusMutation.mutateAsync({ id, status: 'Rejected', rejectionReason: bulkRejectReason });
        succeeded++;
      } catch { /* skip failed */ }
    }
    showToast(t('leave:admin.bulkSuccess', { count: succeeded }), 'success');
    setSelectedIds(new Set());
    setBulkRejectOpen(false);
    setBulkRejectReason('');
  };

  // Toggle select
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all pending on page
  const pendingOnPage = paginatedRequests.filter(r => r.status === 'Pending');
  const allPageSelected = pendingOnPage.length > 0 && pendingOnPage.every(r => selectedIds.has(r.id));
  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pendingOnPage.forEach(r => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pendingOnPage.forEach(r => next.add(r.id));
        return next;
      });
    }
  };

  // CSV Export
  const exportCSV = () => {
    const headers = ['Employee', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason'];
    const rows = filteredRequests.map(r => {
      const emp = employeeMap.get(r.employeeId);
      return [
        emp?.name || r.employeeName,
        emp?.department || '',
        r.type,
        r.startDate,
        r.endDate,
        r.days,
        r.status,
        r.reason || '',
      ];
    });
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deptKeyMap: Record<string, string> = {
    'Human Resources': 'common:departments.humanResources',
    'Engineering': 'common:departments.engineering',
    'Developer': 'common:departments.developer',
    'Marketing': 'common:departments.marketing',
    'Sales': 'common:departments.sales',
    'Finance': 'common:departments.finance',
    'Operations': 'common:departments.operations',
    'Product': 'common:departments.product',
    'Design': 'common:departments.design',
    'Legal': 'common:departments.legal',
    'Customer Support': 'common:departments.customerSupport',
    'Tester': 'common:departments.tester',
  };
  const departmentOptions = useMemo(
    () => [
      { value: 'All', label: t('common:departments.allDepartments') },
      ...DEPARTMENTS.map((d) => ({ value: d, label: t(deptKeyMap[d] || d) })),
    ],
    [t]
  );

  if (isLoadingRequests || isLoadingEmployees) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
            {t('leave:admin.title')}
          </h1>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-1">
            {t('leave:admin.subtitle')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted-light dark:text-text-muted-dark" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('leave:admin.searchEmployee')}
              className="pl-9 pr-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary focus:outline-none w-full sm:w-48"
            />
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-text-light dark:text-text-dark transition-colors"
            title={t('leave:admin.exportCSV')}
          >
            <Download size={16} />
            {t('leave:admin.exportCSV')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                {t('leave:admin.pendingRequests')}
              </p>
              <p className="text-3xl font-bold text-text-light dark:text-text-dark mt-1">
                {stats.pending}
              </p>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">
                {t('leave:admin.ofAllRequests', { rate: stats.pendingRate })}
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {stats.pendingRate}%
              </span>
            </div>
          </div>
        </div>
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl p-5 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                {t('leave:admin.approvedThisMonth')}
              </p>
              <p className="text-3xl font-bold text-text-light dark:text-text-dark mt-1">
                {stats.approvedThisMonth}
              </p>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">
                {t('leave:admin.approvalRate', { rate: stats.approvalRate })}
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                {stats.approvalRate}%
              </span>
            </div>
          </div>
        </div>
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl p-5 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                {t('leave:admin.rejectedThisMonth')}
              </p>
              <p className="text-3xl font-bold text-text-light dark:text-text-dark mt-1">
                {stats.rejectedThisMonth}
              </p>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">
                {t('leave:admin.rejectionRate', { rate: stats.rejectionRate })}
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                {stats.rejectionRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm overflow-hidden">
        <FilterToolbar
          trailing={
            <>
              <span className="text-sm font-medium text-text-muted-light dark:text-text-muted-dark whitespace-nowrap">
                {t('leave:admin.sortBy')}
              </span>
              <Dropdown options={SORT_OPTIONS} value={sortBy} onChange={setSortBy} width="w-auto" />
            </>
          }
        >
          <Dropdown
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
            width="w-auto"
          />
          <Dropdown
            options={LEAVE_TYPE_OPTIONS}
            value={typeFilter}
            onChange={setTypeFilter}
            width="w-auto"
          />
          <Dropdown
            options={departmentOptions}
            value={departmentFilter}
            onChange={setDepartmentFilter}
            width="w-auto"
          />
        </FilterToolbar>
        {/* Desktop Table */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-border-light dark:border-border-dark">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-primary border-border-light dark:border-border-dark rounded focus:ring-primary"
                    title={t('leave:admin.selectAll')}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  {t('leave:admin.employee')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  {t('leave:admin.leaveType')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  {t('leave:admin.dates')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  {t('leave:admin.reason')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  {t('leave:admin.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {paginatedRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-text-muted-light dark:text-text-muted-dark"
                  >
                    {t('leave:admin.noRequests')}
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((request) => {
                  const emp = employeeMap.get(request.employeeId);
                  const days = request.days ?? 1;

                  return (
                    <tr
                      key={request.id}
                      onClick={() => setDetailRequest(request)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                        {request.status === 'Pending' && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(request.id)}
                            onChange={() => toggleSelect(request.id)}
                            className="w-4 h-4 text-primary border-border-light dark:border-border-dark rounded focus:ring-primary"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Avatar
                            src={emp?.avatar || null}
                            name={emp?.name || request.employeeName}
                            size="lg"
                          />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-text-light dark:text-text-dark">
                              {emp?.name || request.employeeName}
                            </p>
                            <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
                              {emp?.department || ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            LEAVE_TYPE_COLORS[request.type] ||
                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {translateLeaveType(request.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-text-light dark:text-text-dark">
                          {request.dates}
                          {request.isHalfDay && request.halfDayPeriod && (
                            <span className="ml-1 text-xs text-text-muted-light dark:text-text-muted-dark">
                              ({t(`leave:halfDay.${request.halfDayPeriod}`)})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
                          {days} {days === 1 ? t('common:time.day') : t('common:time.days')}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-text-light dark:text-text-dark truncate max-w-xs">
                          {request.reason || t('leave:admin.noReason')}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {request.status === 'Cancel Requested' ? (
                            <>
                              <button
                                onClick={() => handleCancelDecision(request, 'approve_cancel')}
                                className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-200 dark:hover:bg-green-900/50 rounded-lg transition-colors"
                              >
                                {t('leave:admin.approveCancel')}
                              </button>
                              <button
                                onClick={() => handleCancelDecision(request, 'reject_cancel')}
                                className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                              >
                                {t('leave:admin.rejectCancel')}
                              </button>
                            </>
                          ) : request.status === 'Pending' || (request.status === 'Manager Approved' && !isManager) ? (
                            <LeaveActionBar
                              employeeName={emp?.name || request.employeeName}
                              onApprove={() => handleApprove(request.id)}
                              onReject={(reason) => handleReject(request.id, reason)}
                              compact={true}
                            />
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
                                request.status === 'Approved'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200'
                                : request.status === 'Manager Approved'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200'
                              }`}
                            >
                              {request.status === 'Approved' ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : request.status === 'Manager Approved' ? (
                                <Clock className="w-3.5 h-3.5" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5" />
                              )}
                              {request.status === 'Manager Approved' ? 'Pending HR' : t(`common:status.${request.status.toLowerCase()}`, { defaultValue: request.status })}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {paginatedRequests.length === 0 ? (
            <div className="px-4 py-12 text-center text-text-muted-light dark:text-text-muted-dark">
              {t('leave:admin.noRequests')}
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {paginatedRequests.map((request) => {
                const emp = employeeMap.get(request.employeeId);
                const days = request.days ?? 1;

                return (
                  <div
                    key={request.id}
                    onClick={() => setDetailRequest(request)}
                    className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 transition-colors"
                  >
                    {/* Header: avatar + name + status */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={emp?.avatar || null}
                          name={emp?.name || request.employeeName}
                          size="lg"
                        />
                        <div>
                          <p className="text-sm font-medium text-text-light dark:text-text-dark">
                            {emp?.name || request.employeeName}
                          </p>
                          <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
                            {emp?.department || ''}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          LEAVE_TYPE_COLORS[request.type] ||
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {translateLeaveType(request.type)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('leave:admin.dates')}</p>
                        <p className="text-text-light dark:text-text-dark">{request.dates}</p>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
                          {days} {days === 1 ? t('common:time.day') : t('common:time.days')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('leave:admin.reason')}</p>
                        <p className="text-text-light dark:text-text-dark truncate">
                          {request.reason || t('leave:admin.noReason')}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {request.status === 'Cancel Requested' ? (
                        <>
                          <button
                            onClick={() => handleCancelDecision(request, 'approve_cancel')}
                            className="flex-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-200 dark:hover:bg-green-900/50 rounded-lg transition-colors text-center"
                          >
                            {t('leave:admin.approveCancel')}
                          </button>
                          <button
                            onClick={() => handleCancelDecision(request, 'reject_cancel')}
                            className="flex-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors text-center"
                          >
                            {t('leave:admin.rejectCancel')}
                          </button>
                        </>
                      ) : request.status === 'Pending' || (request.status === 'Manager Approved' && !isManager) ? (
                        <LeaveActionBar
                          employeeName={emp?.name || request.employeeName}
                          onApprove={() => handleApprove(request.id)}
                          onReject={(reason) => handleReject(request.id, reason)}
                          compact={true}
                        />
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
                            request.status === 'Approved'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200'
                            : request.status === 'Manager Approved'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200'
                          }`}
                        >
                          {request.status === 'Approved' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : request.status === 'Manager Approved' ? (
                            <Clock className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {request.status === 'Manager Approved' ? 'Pending HR' : t(`common:status.${request.status.toLowerCase()}`, { defaultValue: request.status })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-border-light dark:border-border-dark p-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailRequest && (
        <LeaveDetailModal
          isOpen={true}
          request={detailRequest}
          onClose={() => setDetailRequest(null)}
          onApprove={async (id) => {
            await handleApprove(id);
            setDetailRequest(null);
          }}
          onReject={async (req, reason) => {
            await handleReject(req.id, reason);
            setDetailRequest(null);
          }}
        />
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 lg:left-[calc(50%+128px)] -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-lg">
          <span className="text-sm font-medium text-text-light dark:text-text-dark">
            {t('leave:admin.selected', { count: selectedIds.size })}
          </span>
          <button
            onClick={handleBulkApprove}
            disabled={updateLeaveStatusMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('leave:admin.bulkApprove')}
          </button>
          <button
            onClick={() => setBulkRejectOpen(true)}
            disabled={updateLeaveStatusMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('leave:admin.bulkReject')}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-2 text-sm text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors"
          >
            {t('common:buttons.cancel')}
          </button>
        </div>
      )}

      {/* Bulk Reject Modal */}
      {bulkRejectOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark mb-4">
              {t('leave:admin.bulkReject', { count: selectedIds.size })}
            </h2>
            <textarea
              value={bulkRejectReason}
              onChange={(e) => setBulkRejectReason(e.target.value)}
              placeholder={t('leave:rejectDialog.placeholder')}
              className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-primary-light dark:text-text-primary-dark focus:ring-2 focus:ring-primary focus:outline-none min-h-[80px]"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setBulkRejectOpen(false); setBulkRejectReason(''); }}
                className="px-4 py-2 text-sm text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark transition-colors"
              >
                {t('common:buttons.cancel')}
              </button>
              <button
                onClick={handleBulkReject}
                disabled={updateLeaveStatusMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {t('leave:rejectDialog.reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
