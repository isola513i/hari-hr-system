import React, { useState, useMemo } from 'react';
import { useTranslation as useI18nTranslation } from 'react-i18next';
import {
  DollarSign, Clock, FileText, Check, X, Plane, Utensils, Monitor, Package, GraduationCap,
  Receipt, Trash2, CheckCircle2, Download, Search,
} from 'lucide-react';
import { Modal } from '../Modal';
import { Avatar } from '../Avatar';
import { Dropdown } from '../Dropdown';
import { FilterToolbar } from '../FilterToolbar';
import { Pagination } from '../Pagination';
import { useExpensePage } from '../../hooks/useExpensePage';
import { getRequestStatusPill } from '../../lib/requestStatusStyles';

const categoryIcons: Record<string, React.ElementType> = {
  Travel: Plane, Meals: Utensils, Equipment: Monitor, 'Office Supplies': Package, Training: GraduationCap, Other: FileText,
};

const ITEMS_PER_PAGE = 10;

export const ExpenseRequestsTab: React.FC = () => {
  const { t: tReq } = useI18nTranslation(['requests']);
  const {
    t,
    adminSummary,
    claims,
    statusFilter,
    setStatusFilter,
    rejectModalId,
    setRejectModalId,
    rejectReason,
    setRejectReason,
    deleteConfirmId,
    setDeleteConfirmId,
    statusFilterOptions,
    handleApprove,
    handleReject,
    handleReimburse,
    handleDelete,
    formatAmount,
  } = useExpensePage();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  React.useEffect(() => { setPage(1); }, [statusFilter, search]);

  const filtered = useMemo(() => {
    const base = statusFilter === 'All' ? claims : claims.filter(c => c.status === statusFilter);
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter(c => c.employeeName?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q));
  }, [claims, statusFilter, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, page]);

  const exportCSV = () => {
    const headers = ['Employee', 'Title', 'Category', 'Amount', 'Date', 'Status'];
    const rows = filtered.map(c => [c.employeeName, c.title, c.category, c.amount, c.expenseDate, c.status]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-claims-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const CatIcon = (cat: string) => categoryIcons[cat] || FileText;

  const pendingCount = adminSummary?.pendingCount ?? 0;
  const pendingAmount = adminSummary?.pendingAmount ?? 0;
  const monthReimbursed = adminSummary?.monthReimbursed ?? 0;
  const total = claims.length;
  const pendingRate = total > 0 ? Math.round((pendingCount / total) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-light dark:text-text-dark">{t('expenses:page.adminTitle')}</h2>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-1">
            {t('expenses:page.adminSubtitle')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted-light dark:text-text-muted-dark" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tReq('searchPlaceholder')}
              className="pl-9 pr-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary focus:outline-none w-full sm:w-48"
            />
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-text-light dark:text-text-dark transition-colors"
          >
            <Download size={16} />
            {tReq('expense.exportCsv')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('expenses:stats.pendingCount')}</p>
              <p className="text-3xl font-bold text-text-light dark:text-text-dark mt-1">{pendingCount}</p>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">{tReq('expense.ofAllClaims', { rate: pendingRate })}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg"><Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" /></div>
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{pendingRate}%</span>
            </div>
          </div>
        </div>
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl p-5 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('expenses:stats.pendingAmount')}</p>
              <p className="text-3xl font-bold text-text-light dark:text-text-dark mt-1">{formatAmount(pendingAmount)}</p>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">{tReq('expense.awaitingApproval')}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg"><DollarSign className="w-6 h-6 text-orange-600 dark:text-orange-400" /></div>
            </div>
          </div>
        </div>
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl p-5 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('expenses:stats.monthReimbursed')}</p>
              <p className="text-3xl font-bold text-text-light dark:text-text-dark mt-1">{formatAmount(monthReimbursed)}</p>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">{tReq('expense.thisMonth')}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg"><CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm overflow-hidden">
        <FilterToolbar>
          <Dropdown options={statusFilterOptions} value={statusFilter} onChange={setStatusFilter} width="w-auto" />
        </FilterToolbar>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-border-light dark:border-border-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('common:header.employee')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('expenses:form.title')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('expenses:form.category')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('expenses:form.amount')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('expenses:form.expenseDate')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{tReq('expense.statusHeader')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{tReq('expense.actionsHeader')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-muted-light dark:text-text-muted-dark">
                    <Receipt size={32} className="mx-auto mb-3 opacity-20" />
                    <p>{t('expenses:emptyAdmin')}</p>
                  </td>
                </tr>
              ) : paginated.map(claim => {
                const Icon = CatIcon(claim.category);
                return (
                  <tr key={claim.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Avatar src={claim.avatar} name={claim.employeeName} size="sm" />
                        <span className="text-text-light dark:text-text-dark font-medium">{claim.employeeName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Icon size={15} className="text-text-muted-light dark:text-text-muted-dark shrink-0" />
                        <span className="text-text-light dark:text-text-dark font-medium truncate max-w-[160px]">{claim.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-text-muted-light dark:text-text-muted-dark">{t(`expenses:categories.${claim.category}`)}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-text-light dark:text-text-dark">{formatAmount(claim.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-text-muted-light dark:text-text-muted-dark">{new Date(claim.expenseDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getRequestStatusPill(claim.status)}`}>
                        {t(`expenses:status.${claim.status}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        {claim.status === 'Pending' && (
                          <>
                            <button onClick={() => handleApprove(claim.id)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title={t('expenses:actions.approve')}><Check size={16} /></button>
                            <button onClick={() => { setRejectModalId(claim.id); setRejectReason(''); }} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title={t('expenses:actions.reject')}><X size={16} /></button>
                          </>
                        )}
                        {claim.status === 'Approved' && (
                          <button onClick={() => handleReimburse(claim.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title={t('expenses:actions.markReimbursed')}><DollarSign size={16} /></button>
                        )}
                        <button onClick={() => setDeleteConfirmId(claim.id)} className="p-1.5 text-text-muted-light hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title={t('expenses:actions.delete')}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden">
          {paginated.length === 0 ? (
            <div className="p-12 text-center text-text-muted-light dark:text-text-muted-dark">
              <Receipt size={32} className="mx-auto mb-3 opacity-20" />
              <p>{t('expenses:emptyAdmin')}</p>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {paginated.map(claim => {
                const Icon = CatIcon(claim.category);
                return (
                  <div key={claim.id} className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg"><Icon size={18} /></div>
                        <div>
                          <p className="font-semibold text-text-light dark:text-text-dark">{claim.title}</p>
                          <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{claim.employeeName} · {t(`expenses:categories.${claim.category}`)}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRequestStatusPill(claim.status)}`}>{t(`expenses:status.${claim.status}`)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-text-light dark:text-text-dark">{formatAmount(claim.amount)}</p>
                      <div className="flex gap-1">
                        {claim.status === 'Pending' && (
                          <>
                            <button onClick={() => handleApprove(claim.id)} aria-label={t('expenses:actions.approve')} className="p-2 text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg"><Check size={16} /></button>
                            <button onClick={() => { setRejectModalId(claim.id); setRejectReason(''); }} aria-label={t('expenses:actions.reject')} className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg"><X size={16} /></button>
                          </>
                        )}
                        {claim.status === 'Approved' && (
                          <button onClick={() => handleReimburse(claim.id)} aria-label={t('expenses:actions.markReimbursed')} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><DollarSign size={16} /></button>
                        )}
                      </div>
                    </div>
                    {claim.rejectionReason && <p className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-1.5">{claim.rejectionReason}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="border-t border-border-light dark:border-border-dark p-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <Modal isOpen={!!rejectModalId} onClose={() => setRejectModalId(null)} title={t('expenses:actions.reject')} maxWidth="sm">
        <div className="p-6 space-y-4">
          <label className="block text-sm font-medium text-text-light dark:text-text-dark">{t('expenses:rejectReason')}</label>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder={t('expenses:rejectReasonPlaceholder')} rows={3} className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
          <div className="flex justify-end gap-3">
            <button onClick={() => setRejectModalId(null)} className="px-4 py-2 text-sm text-text-muted-light">{t('common:buttons.cancel')}</button>
            <button onClick={handleReject} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">{t('expenses:actions.reject')}</button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title={t('expenses:actions.delete')} maxWidth="sm">
        <div className="p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><Trash2 className="text-red-600" size={24} /></div>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-6">{t('expenses:confirmDelete')}</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm text-text-muted-light">{t('common:buttons.cancel')}</button>
            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"><Trash2 size={16} /> {t('expenses:actions.delete')}</button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
