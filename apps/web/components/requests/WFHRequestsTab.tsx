import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle2, XCircle, Download, Search } from 'lucide-react';
import { Avatar } from '../Avatar';
import { Dropdown, DropdownOption } from '../Dropdown';
import { FilterToolbar } from '../FilterToolbar';
import { LeaveActionBar } from '../LeaveActionBar';
import { Pagination } from '../Pagination';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  useAdminWFHRequests,
  useApproveWFH,
  useRejectWFH,
  useManagerApproveWFH,
} from '../../hooks/queries';
import { formatDate } from '../../lib/date';

type WFHItem = {
  id: string;
  date: string;
  reason: string | null;
  status: 'pending' | 'manager_approved' | 'approved' | 'rejected';
  employeeName?: string;
  employeeDepartment?: string;
  employeeAvatar?: string | null;
};

const ITEMS_PER_PAGE = 10;

export const WFHRequestsTab: React.FC = () => {
  const { t } = useTranslation(['requests']);
  const { showToast } = useToast();
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';

  const WFH_STATUS_OPTIONS: DropdownOption[] = [
    { value: 'pending',          label: t('wfh.statusOptions.pending') },
    { value: 'manager_approved', label: t('wfh.statusOptions.manager_approved') },
    { value: 'all',              label: t('wfh.statusOptions.all') },
    { value: 'approved',         label: t('wfh.statusOptions.approved') },
    { value: 'rejected',         label: t('wfh.statusOptions.rejected') },
  ];

  const WFH_SORT_OPTIONS: DropdownOption[] = [
    { value: 'date_desc', label: t('wfh.sortOptions.date_desc') },
    { value: 'date_asc',  label: t('wfh.sortOptions.date_asc') },
    { value: 'name_asc',  label: t('wfh.sortOptions.name_asc') },
  ];

  const [statusFilter, setStatusFilter] = useState<string>(isManager ? 'pending' : 'manager_approved');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<string>('date_desc');
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);

  const { data: wfhRequests = [], isPending: loading } = useAdminWFHRequests();
  const approveMutation = useApproveWFH();
  const rejectMutation = useRejectWFH();
  const managerApproveMutation = useManagerApproveWFH();

  const allWFH = useMemo(() => wfhRequests as WFHItem[], [wfhRequests]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const result = allWFH.reduce(
      (acc, r) => {
        if (r.status === 'pending' || r.status === 'manager_approved') { acc.pending++; return acc; }
        const d = new Date(r.date);
        if (d.getMonth() !== thisMonth || d.getFullYear() !== thisYear) return acc;
        if (r.status === 'approved') acc.approvedThisMonth++;
        else if (r.status === 'rejected') acc.rejectedThisMonth++;
        return acc;
      },
      { pending: 0, approvedThisMonth: 0, rejectedThisMonth: 0 }
    );
    const decided = result.approvedThisMonth + result.rejectedThisMonth;
    return {
      ...result,
      approvalRate: decided > 0 ? Math.round((result.approvedThisMonth / decided) * 100) : 0,
      rejectionRate: decided > 0 ? Math.round((result.rejectedThisMonth / decided) * 100) : 0,
      pendingRate: allWFH.length > 0 ? Math.round((result.pending / allWFH.length) * 100) : 0,
    };
  }, [allWFH]);

  const filtered = useMemo(() => allWFH
    .filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (search && !r.employeeName?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === 'date_asc') return a.date.localeCompare(b.date);
      if (sort === 'name_asc') return (a.employeeName ?? '').localeCompare(b.employeeName ?? '');
      return b.date.localeCompare(a.date);
    }), [allWFH, statusFilter, search, sort]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, page]);

  React.useEffect(() => { setPage(1); }, [statusFilter, search, sort]);

  const handleApprove = useCallback((id: string) => {
    setActionId(id);
    approveMutation.mutate(id, {
      onSuccess: () => showToast(t('wfh.toast.approved'), 'success'),
      onError: () => showToast(t('wfh.toast.approveFailed'), 'error'),
      onSettled: () => setActionId(null),
    });
  }, [approveMutation, showToast, t]);

  const handleReject = useCallback((id: string) => {
    setActionId(id);
    rejectMutation.mutate(id, {
      onSuccess: () => showToast(t('wfh.toast.rejected'), 'success'),
      onError: () => showToast(t('wfh.toast.rejectFailed'), 'error'),
      onSettled: () => setActionId(null),
    });
  }, [rejectMutation, showToast, t]);

  const handleManagerApprove = useCallback((id: string) => {
    setActionId(id);
    managerApproveMutation.mutate(id, {
      onSuccess: () => showToast(t('wfh.toast.forwardedToHR'), 'success'),
      onError: () => showToast(t('wfh.toast.forwardFailed'), 'error'),
      onSettled: () => setActionId(null),
    });
  }, [managerApproveMutation, showToast, t]);

  const exportCSV = () => {
    const headers = ['Employee', 'Department', 'Date', 'Reason', 'Status'];
    const rows = filtered.map(r => [
      r.employeeName || '',
      r.employeeDepartment || '',
      r.date,
      r.reason || '',
      r.status === 'manager_approved' ? 'Pending HR' : r.status,
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wfh-requests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: WFHItem['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'manager_approved': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    }
  };

  const getStatusLabel = (status: WFHItem['status']) => t(`wfh.status.${status}`);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-light dark:text-text-dark">{t('wfh.title')}</h2>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-1">
            {t('wfh.subtitle')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted-light dark:text-text-muted-dark" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="pl-9 pr-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary focus:outline-none w-full sm:w-48"
            />
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-text-light dark:text-text-dark transition-colors"
          >
            <Download size={16} />
            {t('exportCsv')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('wfh.stats.pendingRequests')}</p>
              <p className="text-3xl font-bold text-text-light dark:text-text-dark mt-1">{stats.pending}</p>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">{t('wfh.stats.pendingRate', { rate: stats.pendingRate })}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" /></div>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{stats.pendingRate}%</span>
            </div>
          </div>
        </div>
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl p-5 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('wfh.stats.approvedThisMonth')}</p>
              <p className="text-3xl font-bold text-text-light dark:text-text-dark mt-1">{stats.approvedThisMonth}</p>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">{t('wfh.stats.approvalRate', { rate: stats.approvalRate })}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg"><CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" /></div>
              <span className="text-xs font-semibold text-green-600 dark:text-green-400">{stats.approvalRate}%</span>
            </div>
          </div>
        </div>
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl p-5 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('wfh.stats.rejectedThisMonth')}</p>
              <p className="text-3xl font-bold text-text-light dark:text-text-dark mt-1">{stats.rejectedThisMonth}</p>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">{t('wfh.stats.rejectionRate', { rate: stats.rejectionRate })}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg"><XCircle className="w-6 h-6 text-red-600 dark:text-red-400" /></div>
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">{stats.rejectionRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm overflow-hidden">
        <FilterToolbar
          trailing={
            <>
              <span className="text-sm font-medium text-text-muted-light dark:text-text-muted-dark whitespace-nowrap">{t('wfh.sortBy')}</span>
              <Dropdown options={WFH_SORT_OPTIONS} value={sort} onChange={setSort} width="w-auto" />
            </>
          }
        >
          <Dropdown options={WFH_STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} width="w-auto" />
        </FilterToolbar>

        {/* Desktop Table */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-border-light dark:border-border-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('wfh.table.employee')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('wfh.table.date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('wfh.table.reason')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('wfh.table.status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('wfh.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-text-muted-light dark:text-text-muted-dark">Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-text-muted-light dark:text-text-muted-dark">{t('wfh.empty')}</td></tr>
              ) : paginated.map((req) => (
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">{formatDate(req.date)}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-text-light dark:text-text-dark truncate max-w-xs">{req.reason || <span className="text-text-muted-light dark:text-text-muted-dark">—</span>}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(req.status)}`}>
                      {req.status === 'approved' ? <CheckCircle2 className="w-3.5 h-3.5" />
                      : req.status === 'rejected' ? <XCircle className="w-3.5 h-3.5" />
                      : <Clock className="w-3.5 h-3.5" />}
                      {getStatusLabel(req.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {req.status === 'pending' && isManager ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleManagerApprove(req.id)} disabled={actionId === req.id} className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 whitespace-nowrap">{t('wfh.actions.forwardToHR')}</button>
                          <button onClick={() => handleReject(req.id)} disabled={actionId === req.id} className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">{t('wfh.actions.reject')}</button>
                        </div>
                      ) : (req.status === 'pending' || req.status === 'manager_approved') && !isManager ? (
                        <LeaveActionBar employeeName={req.employeeName} compact disabled={actionId === req.id} onApprove={() => handleApprove(req.id)} onReject={() => handleReject(req.id)} />
                      ) : (
                        <span className="text-xs text-text-muted-light dark:text-text-muted-dark">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden">
          {loading ? (
            <div className="px-4 py-12 text-center text-text-muted-light dark:text-text-muted-dark">Loading...</div>
          ) : paginated.length === 0 ? (
            <div className="px-4 py-12 text-center text-text-muted-light dark:text-text-muted-dark">{t('wfh.empty')}</div>
          ) : (
            <div className="space-y-3 p-4">
              {paginated.map((req) => (
                <div key={req.id} className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={req.employeeAvatar ?? null} name={req.employeeName ?? '?'} size="lg" />
                      <div>
                        <p className="text-sm font-medium text-text-light dark:text-text-dark">{req.employeeName ?? '—'}</p>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{req.employeeDepartment}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusBadge(req.status)}`}>{getStatusLabel(req.status)}</span>
                  </div>
                  <div className="text-sm text-text-muted-light dark:text-text-muted-dark space-y-0.5 mb-3">
                    <p><span className="font-medium">{t('wfh.mobile.date')}</span> {formatDate(req.date)}</p>
                    {req.reason && <p><span className="font-medium">{t('wfh.mobile.reason')}</span> {req.reason}</p>}
                  </div>
                  {req.status === 'pending' && isManager ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleManagerApprove(req.id)} disabled={actionId === req.id} className="flex-1 px-3 py-1.5 text-xs font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50">{t('wfh.actions.forwardToHR')}</button>
                      <button onClick={() => handleReject(req.id)} disabled={actionId === req.id} className="flex-1 px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">{t('wfh.actions.reject')}</button>
                    </div>
                  ) : (req.status === 'pending' || req.status === 'manager_approved') && !isManager ? (
                    <LeaveActionBar employeeName={req.employeeName} compact disabled={actionId === req.id} onApprove={() => handleApprove(req.id)} onReject={() => handleReject(req.id)} />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="border-t border-border-light dark:border-border-dark p-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
};
