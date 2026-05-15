import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollText,
  Download,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAuditLogsFull, PersistentAuditLog } from '../hooks/queries';
import { BASE_URL, getAuthToken } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { Dropdown } from '../components/Dropdown';
import { DatePicker } from '../components/DatePicker';

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const RESOURCES = ['All', 'employees', 'leave', 'expense', 'attendance', 'wfh', 'ot', 'training', 'assets', 'compliance', 'payroll', 'surveys', 'announcements'];

function methodBadge(method: string) {
  const styles: Record<string, string> = {
    GET: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    PATCH: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return styles[method] ?? 'bg-gray-100 text-gray-600';
}

function actionBadge(action: string, success: boolean) {
  if (!success) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (action.toLowerCase().includes('create') || action.toLowerCase().includes('register')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (action.toLowerCase().includes('delete') || action.toLowerCase().includes('terminat')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (action.toLowerCase().includes('update') || action.toLowerCase().includes('approve') || action.toLowerCase().includes('reject')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
}

const ExpandedRow: React.FC<{ log: PersistentAuditLog }> = ({ log }) => {
  const { t } = useTranslation(['audit-logs']);
  return (
    <tr className="bg-background-light dark:bg-background-dark/40">
      <td colSpan={9} className="px-6 py-3">
        <div className="space-y-2 text-xs">
          <div>
            <span className="font-semibold text-text-muted-light dark:text-text-muted-dark">{t('detail.fullPath')} </span>
            <code className="font-mono text-text-light dark:text-text-dark break-all">{log.path}</code>
          </div>
          {log.userAgent && (
            <div>
              <span className="font-semibold text-text-muted-light dark:text-text-muted-dark">{t('detail.userAgent')} </span>
              <span className="text-text-muted-light dark:text-text-muted-dark break-all">{log.userAgent}</span>
            </div>
          )}
          {log.details && Object.keys(log.details).length > 0 && (
            <div>
              <span className="font-semibold text-text-muted-light dark:text-text-muted-dark">{t('detail.details')}</span>
              <pre className="mt-1 p-2 bg-card-light dark:bg-card-dark rounded-md overflow-auto max-h-40 text-text-light dark:text-text-dark border border-border-light dark:border-border-dark">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

export const AuditLogs: React.FC = () => {
  const { t } = useTranslation(['audit-logs']);
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [resource, setResource] = useState('All');
  const [actionInput, setActionInput] = useState('');
  const [userEmailInput, setUserEmailInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [successFilter, setSuccessFilter] = useState('All');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const actionFilter = useDebounce(actionInput, 400);
  const userEmailFilter = useDebounce(userEmailInput, 400);

  const prevFiltersRef = useRef({ actionFilter, userEmailFilter });
  useEffect(() => {
    if (prevFiltersRef.current.actionFilter !== actionFilter || prevFiltersRef.current.userEmailFilter !== userEmailFilter) {
      setPage(1);
      prevFiltersRef.current = { actionFilter, userEmailFilter };
    }
  }, [actionFilter, userEmailFilter]);

  const RESOURCE_OPTIONS = RESOURCES.map(r => ({ value: r, label: r === 'All' ? t('filters.allResources') : r }));
  const SUCCESS_OPTIONS = [
    { value: 'All', label: t('filters.allOutcomes') },
    { value: 'Success', label: t('filters.success') },
    { value: 'Failed', label: t('filters.failed') },
  ];

  const filters = {
    page,
    limit: 15,
    resource,
    action: actionFilter || undefined,
    userEmail: userEmailFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    success: successFilter,
  };

  const { data, isLoading } = useAuditLogsFull(filters);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExportCSV = async () => {
    const token = getAuthToken();
    const params = new URLSearchParams();
    if (resource && resource !== 'All') params.append('resource', resource);
    if (actionFilter) params.append('action', actionFilter);
    if (userEmailFilter) params.append('userEmail', userEmailFilter);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (successFilter && successFilter !== 'All') params.append('success', successFilter === 'Success' ? 'true' : 'false');
    try {
      const res = await fetch(`${BASE_URL}/compliance/audit-logs/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Failed to export audit logs', 'error');
    }
  };

  const resetFilters = () => {
    setPage(1);
    setResource('All');
    setActionInput('');
    setUserEmailInput('');
    setStartDate('');
    setEndDate('');
    setSuccessFilter('All');
  };

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ScrollText size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">{t('page.title')}</h1>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('page.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Download size={16} />
          {t('buttons.exportCsv')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={15} className="text-text-muted-light dark:text-text-muted-dark" />
          <span className="text-sm font-semibold text-text-muted-light dark:text-text-muted-dark">{t('filters.title')}</span>
          <button onClick={resetFilters} className="ml-auto text-xs text-primary hover:underline">{t('filters.reset')}</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* User email */}
          <div className="relative col-span-2 md:col-span-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark" />
            <input
              type="text"
              placeholder={t('filters.userEmail')}
              value={userEmailInput}
              onChange={(e) => setUserEmailInput(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {/* Action */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark" />
            <input
              type="text"
              placeholder={t('filters.action')}
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {/* Resource */}
          <Dropdown
            options={RESOURCE_OPTIONS}
            value={resource}
            onChange={(val) => { setResource(val); setPage(1); }}
          />
          {/* Success */}
          <Dropdown
            options={SUCCESS_OPTIONS}
            value={successFilter}
            onChange={(val) => { setSuccessFilter(val); setPage(1); }}
          />
          {/* Start date */}
          <div>
            <label className="block text-xs text-text-muted-light dark:text-text-muted-dark mb-1">{t('filters.from')}</label>
            <DatePicker
              value={startDate}
              onChange={(date) => { setStartDate(date); setPage(1); }}
              placeholder={t('filters.startDate')}
            />
          </div>
          {/* End date */}
          <div>
            <label className="block text-xs text-text-muted-light dark:text-text-muted-dark mb-1">{t('filters.to')}</label>
            <DatePicker
              value={endDate}
              onChange={(date) => { setEndDate(date); setPage(1); }}
              placeholder={t('filters.endDate')}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider whitespace-nowrap">{t('table.timestamp')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('table.user')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('table.action')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('table.resource')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('table.method')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('table.status')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider whitespace-nowrap">{t('table.duration')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('table.ip')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9} className="px-4 py-3">
                      <div className="h-4 bg-background-light dark:bg-background-dark/50 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : !data?.data?.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-text-muted-light dark:text-text-muted-dark">
                    <ScrollText size={36} className="mx-auto mb-3 opacity-20" />
                    <p>{t('empty')}</p>
                  </td>
                </tr>
              ) : (
                data.data.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr
                      className="hover:bg-background-light dark:hover:bg-background-dark/30 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(log.id)}
                    >
                      <td className="px-4 py-3 text-text-muted-light dark:text-text-muted-dark">
                        {expandedIds.has(log.id)
                          ? <ChevronDown size={14} />
                          : <ChevronRight size={14} />
                        }
                      </td>
                      <td className="px-4 py-3 text-text-muted-light dark:text-text-muted-dark whitespace-nowrap font-mono text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-text-light dark:text-text-dark max-w-[180px] truncate" title={log.userEmail ?? t('system')}>
                        {log.userEmail ?? <span className="italic text-text-muted-light dark:text-text-muted-dark">{t('system')}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${actionBadge(log.action, log.success)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted-light dark:text-text-muted-dark text-xs">
                        {log.resource}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium ${methodBadge(log.method)}`}>
                          {log.method}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {log.success
                            ? <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                            : <XCircle size={14} className="text-red-500 flex-shrink-0" />
                          }
                          <span className={`text-xs font-medium ${log.statusCode >= 400 ? 'text-red-600 dark:text-red-400' : 'text-text-muted-light dark:text-text-muted-dark'}`}>
                            {log.statusCode}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-muted-light dark:text-text-muted-dark text-xs whitespace-nowrap">
                        {log.duration != null ? `${log.duration}ms` : '—'}
                      </td>
                      <td className="px-4 py-3 text-text-muted-light dark:text-text-muted-dark font-mono text-xs">
                        {log.ip ?? '—'}
                      </td>
                    </tr>
                    {expandedIds.has(log.id) && <ExpandedRow log={log} />}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border-light dark:border-border-dark">
            <span className="text-sm text-text-muted-light dark:text-text-muted-dark">
              {totalPages > 1 ? t('pagination.pageOf', { page, total: totalPages }) : ''}{data.total} {data.total === 1 ? t('pagination.result') : t('pagination.results')}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark disabled:opacity-40 transition-colors"
                >
                  {t('buttons.previous')}
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark disabled:opacity-40 transition-colors"
                >
                  {t('buttons.next')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
