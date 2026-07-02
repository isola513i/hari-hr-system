import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useModalA11y } from '../../hooks/useModalA11y';
import { Clock, CheckCircle2, XCircle, Timer, Download, Search } from 'lucide-react';
import { Avatar } from '../Avatar';
import { Dropdown, DropdownOption } from '../Dropdown';
import { FilterToolbar } from '../FilterToolbar';
import { LeaveActionBar } from '../LeaveActionBar';
import { Pagination } from '../Pagination';
import { useToast } from '../../contexts/ToastContext';
import { getRequestStatusPill } from '../../lib/requestStatusStyles';
import {
  useAllOTRequests,
  useOTStats,
  useApproveOT,
  useRejectOT,
  type OTRequest,
} from '../../hooks/queries';
import { formatDate } from '../../lib/date';

const ITEMS_PER_PAGE = 10;

export const OTRequestsTab: React.FC = () => {
  const { t } = useTranslation(['requests']);
  const { showToast } = useToast();

  const OT_STATUS_OPTIONS: DropdownOption[] = [
    { value: 'pending',  label: t('ot.statusOptions.pending') },
    { value: 'all',      label: t('ot.statusOptions.all') },
    { value: 'approved', label: t('ot.statusOptions.approved') },
    { value: 'rejected', label: t('ot.statusOptions.rejected') },
  ];

  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  // Accessibility for the hand-rolled reject dialog
  const closeReject = useCallback(() => { setRejectId(null); setRejectNotes(''); }, []);
  const rejectDialogRef = useModalA11y(!!rejectId, closeReject);

  const { data: otRequests = [], isPending: loading } = useAllOTRequests();
  const { data: otStatsData } = useOTStats();
  const approveOTMutation = useApproveOT();
  const rejectOTMutation = useRejectOT();

  const stats = useMemo(() => {
    const pending = otStatsData?.pending ?? 0;
    const approvedThisMonth = otStatsData?.approvedThisMonth ?? 0;
    const totalOTHours = otStatsData?.totalOTHoursThisMonth ?? 0;
    const all = (otRequests as OTRequest[]).length;
    return {
      pending,
      approvedThisMonth,
      totalOTHours,
      pendingRate: all > 0 ? Math.round((pending / all) * 100) : 0,
    };
  }, [otStatsData, otRequests]);

  const filtered = useMemo(() => (otRequests as OTRequest[])
    .filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) {return false;}
      if (search && !r.employeeName?.toLowerCase().includes(search.toLowerCase())) {return false;}
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  [otRequests, statusFilter, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, page]);

  React.useEffect(() => { setPage(1); }, [statusFilter, search]);

  const handleApprove = useCallback((id: string) => {
    setActionId(id);
    approveOTMutation.mutate({ id }, {
      onSuccess: () => showToast(t('ot.toast.approved'), 'success'),
      onError: () => showToast(t('ot.toast.approveFailed'), 'error'),
      onSettled: () => setActionId(null),
    });
  }, [approveOTMutation, showToast, t]);

  const handleRejectSubmit = useCallback(() => {
    if (!rejectId) {return;}
    setActionId(rejectId);
    rejectOTMutation.mutate({ id: rejectId, notes: rejectNotes || undefined }, {
      onSuccess: () => { showToast(t('ot.toast.rejected'), 'success'); setRejectId(null); setRejectNotes(''); },
      onError: () => showToast(t('ot.toast.rejectFailed'), 'error'),
      onSettled: () => setActionId(null),
    });
  }, [rejectOTMutation, rejectId, rejectNotes, showToast, t]);

  const exportCSV = () => {
    const headers = ['Employee', 'Department', 'Date', 'Type', 'Planned Hours', 'Actual Hours', 'Reason', 'Status'];
    const rows = filtered.map(r => [
      r.employeeName || '',
      r.department || '',
      r.date,
      r.otType === 'holiday' ? t('ot.otType.holidayCsv') : t('ot.otType.regularCsv'),
      r.plannedHours,
      r.actualHours ?? '',
      r.reason || '',
      r.status,
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ot-requests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => getRequestStatusPill(status);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-light dark:text-text-dark">{t('ot.title')}</h2>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-1">
            {t('ot.subtitle')}
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
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('ot.stats.pendingRequests')}</p>
              <p className="text-3xl font-bold text-text-light dark:text-text-dark mt-1">{stats.pending}</p>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">{t('ot.stats.pendingRate', { rate: stats.pendingRate })}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg"><Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" /></div>
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{stats.pendingRate}%</span>
            </div>
          </div>
        </div>
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl p-5 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('ot.stats.approvedThisMonth')}</p>
              <p className="text-3xl font-bold text-text-light dark:text-text-dark mt-1">{stats.approvedThisMonth}</p>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">{t('ot.stats.approvedSubtext')}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg"><CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" /></div>
            </div>
          </div>
        </div>
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('ot.stats.totalOTHours')}</p>
              <p className="text-3xl font-bold text-text-light dark:text-text-dark mt-1">{stats.totalOTHours.toFixed(1)} h</p>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">{t('ot.stats.thisMonth')}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Timer className="w-6 h-6 text-blue-600 dark:text-blue-400" /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm overflow-hidden">
        <FilterToolbar>
          <Dropdown options={OT_STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} width="w-auto" />
        </FilterToolbar>

        {/* Desktop Table */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-border-light dark:border-border-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('ot.table.employee')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('ot.table.date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('ot.table.type')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('ot.table.hours')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('ot.table.reason')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('ot.table.status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('ot.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-text-muted-light dark:text-text-muted-dark">Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-text-muted-light dark:text-text-muted-dark">{t('ot.empty')}</td></tr>
              ) : paginated.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Avatar src={req.employeeAvatar ?? null} name={req.employeeName ?? '?'} size="lg" />
                      <div>
                        <p className="text-sm font-medium text-text-light dark:text-text-dark">{req.employeeName ?? '—'}</p>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{req.department}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-text-light dark:text-text-dark">{formatDate(req.date)}</p>
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{req.plannedStart} – {req.plannedEnd}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                      req.otType === 'holiday'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    }`}>
                      {req.otType === 'holiday' ? t('ot.otType.holiday') : t('ot.otType.regular')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="text-text-light dark:text-text-dark">{req.plannedHours}h</span>
                    {req.actualHours != null && (
                      <span className="text-text-muted-light dark:text-text-muted-dark"> / <span className="text-green-600 dark:text-green-400">{req.actualHours}h</span></span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-text-light dark:text-text-dark truncate max-w-xs">{req.reason || <span className="text-text-muted-light dark:text-text-muted-dark">—</span>}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(req.status)}`}>
                      {req.status === 'approved' ? <CheckCircle2 className="w-3.5 h-3.5" /> : req.status === 'rejected' ? <XCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {req.status === 'pending' ? (
                      <LeaveActionBar
                        employeeName={req.employeeName}
                        compact
                        disabled={actionId === req.id}
                        onApprove={() => handleApprove(req.id)}
                        onReject={() => { setRejectId(req.id); setRejectNotes(''); }}
                      />
                    ) : (
                      <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{req.reviewerName ? t('ot.reviewedBy', { name: req.reviewerName }) : '—'}</span>
                    )}
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
            <div className="px-4 py-12 text-center text-text-muted-light dark:text-text-muted-dark">{t('ot.empty')}</div>
          ) : (
            <div className="space-y-3 p-4">
              {paginated.map((req) => (
                <div key={req.id} className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={req.employeeAvatar ?? null} name={req.employeeName ?? '?'} size="lg" />
                      <div>
                        <p className="text-sm font-medium text-text-light dark:text-text-dark">{req.employeeName ?? '—'}</p>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{req.department}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${getStatusBadge(req.status)}`}>{req.status}</span>
                  </div>
                  <div className="text-sm text-text-muted-light dark:text-text-muted-dark space-y-0.5 mb-3">
                    <p><span className="font-medium">{t('ot.mobile.date')}</span> {formatDate(req.date)} ({req.plannedStart} – {req.plannedEnd})</p>
                    <p><span className="font-medium">{t('ot.mobile.hours')}</span> {req.plannedHours}h{req.actualHours != null ? ` / ${req.actualHours}h ${t('ot.mobile.actual')}` : ''}</p>
                    <p><span className="font-medium">{t('ot.mobile.type')}</span> {req.otType === 'holiday' ? t('ot.otType.holidayCsv') : t('ot.otType.regularCsv')}</p>
                    {req.reason && <p><span className="font-medium">{t('ot.mobile.reason')}</span> {req.reason}</p>}
                  </div>
                  {req.status === 'pending' && (
                    <LeaveActionBar
                      employeeName={req.employeeName}
                      compact
                      disabled={actionId === req.id}
                      onApprove={() => handleApprove(req.id)}
                      onReject={() => { setRejectId(req.id); setRejectNotes(''); }}
                    />
                  )}
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

      {/* Reject Dialog */}
      {rejectId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) {closeReject();} }}
        >
          <div
            ref={rejectDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ot-reject-title"
            className="bg-card-light dark:bg-card-dark rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4"
          >
            <h3 id="ot-reject-title" className="text-base font-semibold text-text-light dark:text-text-dark">{t('ot.rejectDialog.title')}</h3>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('ot.rejectDialog.subtitle')}</p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder={t('ot.rejectDialog.placeholder')}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => { setRejectId(null); setRejectNotes(''); }} className="flex-1 px-4 py-2 text-sm font-medium border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t('ot.rejectDialog.cancel')}</button>
              <button onClick={handleRejectSubmit} disabled={!!actionId} className="flex-1 px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">
                {actionId ? t('ot.rejectDialog.rejecting') : t('ot.rejectDialog.reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
