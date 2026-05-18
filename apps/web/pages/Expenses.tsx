import React from 'react';
import {
  DollarSign, Plus, Clock, FileText, Check, X, Plane, Utensils, Monitor, Package, GraduationCap,
  Receipt, Pencil, Trash2, Ban, CheckCircle2,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { Avatar } from '../components/Avatar';
import { Dropdown } from '../components/Dropdown';
import { DatePicker } from '../components/DatePicker';
import type { ExpenseClaimStatus, ExpenseCategory } from '../types';
import { useExpensePage } from '../hooks/useExpensePage';

const CATEGORIES: ExpenseCategory[] = ['Travel', 'Meals', 'Equipment', 'Office Supplies', 'Training', 'Other'];

const categoryIcons: Record<string, React.ElementType> = {
  Travel: Plane, Meals: Utensils, Equipment: Monitor, 'Office Supplies': Package, Training: GraduationCap, Other: FileText,
};

const statusColors: Record<ExpenseClaimStatus, string> = {
  Pending: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900',
  Approved: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900',
  Rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900',
  Reimbursed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900',
  Cancelled: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/20 dark:text-gray-400 dark:border-gray-700',
};

const statusDotColors: Record<ExpenseClaimStatus, string> = {
  Pending: 'bg-yellow-500', Approved: 'bg-green-500', Rejected: 'bg-red-500', Reimbursed: 'bg-blue-500', Cancelled: 'bg-gray-400',
};

export const Expenses: React.FC = () => {
  const {
    t,
    isAdmin,
    empSummary,
    adminSummary,
    filtered,
    isFormOpen,
    setIsFormOpen,
    editingClaim,
    statusFilter,
    setStatusFilter,
    rejectModalId,
    setRejectModalId,
    rejectReason,
    setRejectReason,
    cancelConfirmId,
    setCancelConfirmId,
    deleteConfirmId,
    setDeleteConfirmId,
    formTitle,
    setFormTitle,
    formCategory,
    setFormCategory,
    formAmount,
    setFormAmount,
    formDate,
    setFormDate,
    formDescription,
    setFormDescription,
    setFormReceipt,
    formErrors,
    setFormErrors,
    statusFilterOptions,
    createMutation,
    openCreate,
    openEdit,
    resetForm,
    handleSubmit,
    handleApprove,
    handleReject,
    handleReimburse,
    handleCancel,
    handleDelete,
    formatAmount,
  } = useExpensePage();

  const CatIcon = (cat: string) => categoryIcons[cat] || FileText;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">
            {isAdmin ? t('expenses:page.adminTitle') : t('expenses:page.title')}
          </h1>
          <p className="text-text-muted-light dark:text-text-muted-dark mt-1">
            {isAdmin ? t('expenses:page.adminSubtitle') : t('expenses:page.subtitle')}
          </p>
        </div>
        {!isAdmin && (
          <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary-hover transition-colors">
            <Plus size={18} /> {t('expenses:form.newExpense')}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {!isAdmin ? (
          <>
            <StatCard icon={<DollarSign size={20} />} bg="bg-green-100 dark:bg-green-900/20 text-green-600" label={t('expenses:stats.totalReimbursed')} value={formatAmount(empSummary?.totalReimbursed ?? 0)} />
            <StatCard icon={<Clock size={20} />} bg="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600" label={t('expenses:stats.pendingApproval')} value={formatAmount(empSummary?.pendingAmount ?? 0)} />
            <StatCard icon={<FileText size={20} />} bg="bg-blue-100 dark:bg-blue-900/20 text-blue-600" label={t('expenses:stats.thisMonth')} value={`${empSummary?.thisMonthCount ?? 0} ${t('expenses:stats.reports')}`} />
          </>
        ) : (
          <>
            <StatCard icon={<Clock size={20} />} bg="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600" label={t('expenses:stats.pendingCount')} value={String(adminSummary?.pendingCount ?? 0)} />
            <StatCard icon={<DollarSign size={20} />} bg="bg-orange-100 dark:bg-orange-900/20 text-orange-600" label={t('expenses:stats.pendingAmount')} value={formatAmount(adminSummary?.pendingAmount ?? 0)} />
            <StatCard icon={<CheckCircle2 size={20} />} bg="bg-green-100 dark:bg-green-900/20 text-green-600" label={t('expenses:stats.monthReimbursed')} value={formatAmount(adminSummary?.monthReimbursed ?? 0)} />
          </>
        )}
      </div>

      {/* Claims List */}
      <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-border-light dark:border-border-dark flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{isAdmin ? t('expenses:allClaims') : t('expenses:history')}</h2>
          <div className="ml-auto">
            <Dropdown
              options={statusFilterOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              width="w-40"
            />
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-text-muted-light dark:text-text-muted-dark font-semibold tracking-wide">
              <tr>
                {isAdmin && <th className="px-6 py-3">{t('common:header.employee')}</th>}
                <th className="px-6 py-3">{t('expenses:form.title')}</th>
                <th className="px-6 py-3">{t('expenses:form.category')}</th>
                <th className="px-6 py-3">{t('expenses:form.amount')}</th>
                <th className="px-6 py-3">{t('expenses:form.expenseDate')}</th>
                <th className="px-6 py-3">{t('common:status.pending').split(' ')[0]}</th>
                <th className="px-6 py-3 text-right">{t('common:buttons.edit')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {filtered.map(claim => {
                const Icon = CatIcon(claim.category);
                return (
                  <tr key={claim.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    {isAdmin && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Avatar src={claim.avatar} name={claim.employeeName} size="sm" />
                          <span className="text-text-light dark:text-text-dark font-medium">{claim.employeeName}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Icon size={16} className="text-text-muted-light" />
                        <span className="text-text-light dark:text-text-dark font-medium">{claim.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-muted-light dark:text-text-muted-dark">{t(`expenses:categories.${claim.category}`)}</td>
                    <td className="px-6 py-4 font-semibold text-text-light dark:text-text-dark">{formatAmount(claim.amount)}</td>
                    <td className="px-6 py-4 text-text-muted-light dark:text-text-muted-dark">{new Date(claim.expenseDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[claim.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusDotColors[claim.status]}`}></span>
                        {t(`expenses:status.${claim.status}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && claim.status === 'Pending' && (
                          <>
                            <button onClick={() => handleApprove(claim.id)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title={t('expenses:actions.approve')}><Check size={16} /></button>
                            <button onClick={() => { setRejectModalId(claim.id); setRejectReason(''); }} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title={t('expenses:actions.reject')}><X size={16} /></button>
                          </>
                        )}
                        {isAdmin && claim.status === 'Approved' && (
                          <button onClick={() => handleReimburse(claim.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title={t('expenses:actions.markReimbursed')}><DollarSign size={16} /></button>
                        )}
                        {!isAdmin && claim.status === 'Pending' && (
                          <>
                            <button onClick={() => openEdit(claim)} className="p-1.5 text-text-muted-light hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title={t('expenses:actions.edit')}><Pencil size={16} /></button>
                            <button onClick={() => setCancelConfirmId(claim.id)} className="p-1.5 text-text-muted-light hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title={t('expenses:actions.cancel')}><Ban size={16} /></button>
                          </>
                        )}
                        {isAdmin && (
                          <button onClick={() => setDeleteConfirmId(claim.id)} className="p-1.5 text-text-muted-light hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title={t('expenses:actions.delete')}><Trash2 size={16} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3 p-4">
          {filtered.map(claim => {
            const Icon = CatIcon(claim.category);
            return (
              <div key={claim.id} className="bg-background-light dark:bg-background-dark rounded-xl border border-border-light dark:border-border-dark p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg"><Icon size={18} /></div>
                    <div>
                      <p className="font-semibold text-text-light dark:text-text-dark">{claim.title}</p>
                      <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{t(`expenses:categories.${claim.category}`)} · {new Date(claim.expenseDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[claim.status]}`}>{t(`expenses:status.${claim.status}`)}</span>
                </div>
                {isAdmin && <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-2">{claim.employeeName}</p>}
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-text-light dark:text-text-dark">{formatAmount(claim.amount)}</p>
                  <div className="flex gap-1">
                    {isAdmin && claim.status === 'Pending' && (
                      <>
                        <button onClick={() => handleApprove(claim.id)} className="p-2 text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg"><Check size={16} /></button>
                        <button onClick={() => { setRejectModalId(claim.id); setRejectReason(''); }} className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg"><X size={16} /></button>
                      </>
                    )}
                    {isAdmin && claim.status === 'Approved' && (
                      <button onClick={() => handleReimburse(claim.id)} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><DollarSign size={16} /></button>
                    )}
                    {!isAdmin && claim.status === 'Pending' && (
                      <button onClick={() => setCancelConfirmId(claim.id)} className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg"><Ban size={16} /></button>
                    )}
                  </div>
                </div>
                {claim.rejectionReason && <p className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-1.5">{claim.rejectionReason}</p>}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center text-text-muted-light dark:text-text-muted-dark">
            <Receipt size={32} className="mx-auto mb-3 opacity-20" />
            <p>{isAdmin ? t('expenses:emptyAdmin') : t('expenses:empty')}</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); resetForm(); }} title={editingClaim ? t('expenses:form.editExpense') : t('expenses:form.newExpense')} maxWidth="lg">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('expenses:form.title')}</label>
            <input type="text" value={formTitle} onChange={e => { setFormTitle(e.target.value); setFormErrors(p => ({ ...p, title: false })); }} placeholder={t('expenses:form.titlePlaceholder')} className={`w-full px-3 py-2 bg-background-light dark:bg-background-dark border rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary ${formErrors.title ? 'border-red-500' : 'border-border-light dark:border-border-dark'}`} />
            {formErrors.title && <p className="text-xs text-red-500 mt-1">{t('expenses:toast.titleRequired')}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('expenses:form.category')}</label>
              <Dropdown
                options={CATEGORIES.map(c => ({ value: c, label: t(`expenses:categories.${c}`) }))}
                value={formCategory}
                onChange={v => { setFormCategory(v); setFormErrors(p => ({ ...p, category: false })); }}
                placeholder={t('expenses:form.selectCategory')}
                width="w-full"
              />
              {formErrors.category && <p className="text-xs text-red-500 mt-1">{t('expenses:toast.categoryRequired')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('expenses:form.amount')}</label>
              <input type="number" min="0" step="0.01" value={formAmount} onChange={e => { setFormAmount(e.target.value); setFormErrors(p => ({ ...p, amount: false })); }} placeholder={t('expenses:form.amountPlaceholder')} className={`w-full px-3 py-2 bg-background-light dark:bg-background-dark border rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary ${formErrors.amount ? 'border-red-500' : 'border-border-light dark:border-border-dark'}`} />
              {formErrors.amount && <p className="text-xs text-red-500 mt-1">{t('expenses:toast.amountRequired')}</p>}
            </div>
          </div>
          <div>
            <DatePicker
              label={t('expenses:form.expenseDate')}
              value={formDate}
              onChange={v => { setFormDate(v); setFormErrors(p => ({ ...p, date: false })); }}
            />
            {formErrors.date && <p className="text-xs text-red-500 mt-1">{t('expenses:toast.dateRequired')}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('expenses:form.description')}</label>
            <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder={t('expenses:form.descriptionPlaceholder')} rows={3} className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('expenses:form.receipt')}</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFormReceipt(e.target.files?.[0] || null)} className="w-full text-sm text-text-muted-light file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setIsFormOpen(false); resetForm(); }} className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light">{t('common:buttons.cancel')}</button>
            <button type="button" onClick={handleSubmit} disabled={createMutation.isPending} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50">
              <Check size={16} /> {editingClaim ? t('expenses:form.update') : t('expenses:form.submit')}
            </button>
          </div>
        </div>
      </Modal>

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

      {/* Cancel Confirm */}
      <Modal isOpen={!!cancelConfirmId} onClose={() => setCancelConfirmId(null)} title={t('expenses:actions.cancel')} maxWidth="sm">
        <div className="p-6 text-center">
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-6">{t('expenses:confirmCancel')}</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => setCancelConfirmId(null)} className="px-4 py-2 text-sm text-text-muted-light">{t('common:buttons.back')}</button>
            <button onClick={handleCancel} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">{t('expenses:actions.cancel')}</button>
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

// Stats card sub-component
const StatCard: React.FC<{ icon: React.ReactNode; bg: string; label: string; value: string }> = ({ icon, bg, label, value }) => (
  <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 shadow-sm">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${bg}`}>{icon}</div>
      <div>
        <p className="text-text-muted-light dark:text-text-muted-dark text-xs">{label}</p>
        <p className="text-xl font-bold text-text-light dark:text-text-dark">{value}</p>
      </div>
    </div>
  </div>
);

export default Expenses;
