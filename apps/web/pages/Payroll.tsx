import React from 'react';
import { createPortal } from 'react-dom';
import {
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Play,
  Users,
  Banknote,
  Receipt,
  TrendingUp,
  Settings,
  Trash2,
  PlusCircle,
  X,
  Download,
  Mail,
  Wallet,
  Shield,
  CalendarCheck,
} from 'lucide-react';
import { SearchableSelect } from '../components/SearchableSelect';
import { DatePicker } from '../components/DatePicker';
import { usePayrollPage, formatCurrency, formatDate } from '../hooks/usePayrollPage';

// ---------------------------------------------------------------------------
// Helpers (JSX-returning, kept in component file)
// ---------------------------------------------------------------------------
function statusIcon(status: string) {
  if (status === 'Paid') return <CheckCircle2 size={16} className="text-accent-green" />;
  if (status === 'Processed') return <Clock size={16} className="text-primary" />;
  if (status === 'Cancelled') return <X size={16} className="text-accent-red" />;
  return <AlertCircle size={16} className="text-accent-orange" />;
}

function statusBadge(status: string, label: string) {
  const cls = status === 'Paid'
    ? 'text-accent-green bg-accent-green/10'
    : status === 'Processed'
      ? 'text-primary bg-primary/10'
      : status === 'Cancelled'
        ? 'text-accent-red bg-accent-red/10'
        : 'text-accent-orange bg-accent-orange/10';
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Payroll: React.FC = () => {
  const {
    t,
    isAdminView,
    summary,
    showCreate,
    setShowCreate,
    allEmployees,
    createPayroll,
    batchCreatePayroll,
    updatePayroll,
    updatePayrollSettings,
    createForm,
    setCreateForm,
    showBatch,
    setShowBatch,
    batchForm,
    setBatchForm,
    batchResult,
    handleBatchCreate,
    handleCreate,
    handleStatusChange,
    editingRecord,
    setEditingRecord,
    editForm,
    setEditForm,
    openEdit,
    handleEdit,
    closeBatch,
    showSettings,
    settingsForm,
    setSettingsForm,
    openSettings,
    closeSettings,
    handleSaveSettings,
    handleDownloadPayslip,
    handleEmailPayslip,
    handleExportCSV,
    expandedId,
    setExpandedId,
    records,
    isLoading,
    employeeSummary,
  } = usePayrollPage();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <header className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-text-light dark:text-text-dark text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-text-muted-light dark:text-text-muted-dark text-base mt-1">{t('subtitle')}</p>
        </div>
        {isAdminView && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openSettings}
              className="flex items-center gap-2 px-4 py-2.5 border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-medium rounded-lg text-sm hover:bg-background-light dark:hover:bg-background-dark transition-colors"
            >
              <Settings size={18} />
              {t('settings.title')}
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-medium rounded-lg text-sm hover:bg-background-light dark:hover:bg-background-dark transition-colors"
            >
              <Download size={18} />
              {t('admin.actions.exportCSV')}
            </button>
            <button
              onClick={() => { setShowBatch(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent-green text-white font-medium rounded-lg text-sm shadow-sm hover:bg-accent-green/90 transition-colors"
            >
              <Play size={18} />
              {t('batch.runPayroll')}
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Plus size={18} />
              {t('admin.actions.createPayroll')}
            </button>
          </div>
        )}
      </header>

      {/* Admin Summary Cards */}
      {isAdminView && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            icon={<Banknote size={20} />}
            label={t('admin.summary.totalPayroll')}
            value={`฿${formatCurrency(summary.totalPayroll)}`}
            color="text-accent-green bg-accent-green/10"
          />
          <SummaryCard
            icon={<Receipt size={20} />}
            label={t('admin.summary.totalTax')}
            value={`฿${formatCurrency(summary.totalTax)}`}
            color="text-accent-orange bg-accent-orange/10"
          />
          <SummaryCard
            icon={<Users size={20} />}
            label={t('admin.summary.totalEmployees')}
            value={String(summary.totalEmployees)}
            color="text-primary bg-primary/10"
          />
          <SummaryCard
            icon={<TrendingUp size={20} />}
            label={t('admin.summary.paidCount')}
            value={`${summary.paidCount} / ${summary.paidCount + summary.processedCount + summary.pendingCount}`}
            color="text-accent-teal bg-accent-teal/10"
          />
        </div>
      )}

      {/* Admin Status Breakdown */}
      {isAdminView && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-orange/10"><AlertCircle size={18} className="text-accent-orange" /></div>
            <div>
              <p className="text-2xl font-bold text-text-light dark:text-text-dark">{summary.pendingCount}</p>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('status.pending')}</p>
            </div>
          </div>
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Clock size={18} className="text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-text-light dark:text-text-dark">{summary.processedCount}</p>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('status.processed')}</p>
            </div>
          </div>
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-green/10"><CheckCircle2 size={18} className="text-accent-green" /></div>
            <div>
              <p className="text-2xl font-bold text-text-light dark:text-text-dark">{summary.paidCount}</p>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('status.paid')}</p>
            </div>
          </div>
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-red/10"><X size={18} className="text-accent-red" /></div>
            <div>
              <p className="text-2xl font-bold text-text-light dark:text-text-dark">{summary.cancelledCount}</p>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('status.cancelled')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Employee Summary Cards */}
      {!isAdminView && employeeSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            icon={<Wallet size={20} />}
            label={t('employee.summary.latestNetPay')}
            value={`฿${formatCurrency(employeeSummary.latestNetPay)}`}
            color="text-accent-green bg-accent-green/10"
          />
          <SummaryCard
            icon={<Receipt size={20} />}
            label={t('employee.summary.ytdTax')}
            value={`฿${formatCurrency(employeeSummary.ytdTax)}`}
            color="text-accent-red bg-accent-red/10"
          />
          <SummaryCard
            icon={<Shield size={20} />}
            label={t('employee.summary.ytdSSF')}
            value={`฿${formatCurrency(employeeSummary.ytdSSF)}`}
            color="text-blue-500 bg-blue-500/10"
          />
          <SummaryCard
            icon={<CalendarCheck size={20} />}
            label={t('employee.summary.paidMonths')}
            value={String(employeeSummary.paidMonths)}
            color="text-primary bg-primary/10"
          />
        </div>
      )}

      {/* Payslip List */}
      <section className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark">
        <div className="p-6 border-b border-border-light dark:border-border-dark">
          <h2 className="text-text-light dark:text-text-dark text-xl font-bold tracking-tight">
            {isAdminView ? t('admin.dashboard') : t('employee.myPayslips')}
          </h2>
        </div>

        <div className="divide-y divide-border-light dark:divide-border-dark">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4">
                <div className="h-12 bg-background-light dark:bg-background-dark/50 rounded-lg animate-pulse" />
              </div>
            ))
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted-light dark:text-text-muted-dark">
              <FileText size={40} className="mb-3 opacity-20" />
              <p className="text-sm">{t('empty.noPayslips')}</p>
            </div>
          ) : (
            records.map((record) => (
              <div key={record.id}>
                {/* Row */}
                <button
                  onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-background-light dark:hover:bg-background-dark/50 transition-colors text-left"
                >
                  <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                    <DollarSign size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isAdminView && 'employeeName' in record && (
                      <p className="text-sm font-semibold text-text-light dark:text-text-dark">
                        {(record as { employeeName: string }).employeeName}
                      </p>
                    )}
                    <p className={`text-sm ${isAdminView ? 'text-text-muted-light dark:text-text-muted-dark' : 'font-medium text-text-light dark:text-text-dark'}`}>
                      {formatDate(record.payPeriodStart)} — {formatDate(record.payPeriodEnd)}
                    </p>
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">
                      {t('form.baseSalary')}: ฿{formatCurrency(record.baseSalary)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-text-light dark:text-text-dark">฿{formatCurrency(record.netPay)}</p>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      {statusIcon(record.status)}
                      {statusBadge(record.status, t(`status.${record.status.toLowerCase()}`))}
                    </div>
                  </div>
                  {expandedId === record.id ? <ChevronUp size={16} className="text-text-muted-light" /> : <ChevronDown size={16} className="text-text-muted-light" />}
                </button>

                {/* Expanded Detail */}
                {expandedId === record.id && (
                  <div className="px-4 pb-4">
                    <div className="bg-background-light dark:bg-background-dark rounded-lg p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <DetailItem label={t('form.baseSalary')} value={`฿${formatCurrency(record.baseSalary)}`} />
                        <DetailItem label={t('form.overtimeHours')} value={`${record.overtimeHours}h`} />
                        <DetailItem label={t('employee.detail.overtimePay')} value={`฿${formatCurrency(record.overtimePay)}`} />
                        <DetailItem label={t('form.bonus')} value={`฿${formatCurrency(record.bonus)}`} positive />
                        <DetailItem label={t('form.leaveDeduction')} value={`-฿${formatCurrency(record.leaveDeduction)}`} negative />
                        <DetailItem label={t('form.otherDeductions')} value={`-฿${formatCurrency(record.deductions)}`} negative />
                        <DetailItem label={t('form.taxAmount')} value={`-฿${formatCurrency(record.taxAmount)}`} negative />
                        <DetailItem label={t('employee.detail.ssfEmployee')} value={`-฿${formatCurrency(record.ssfEmployee)}`} negative />
                        <DetailItem label={t('employee.detail.pvfEmployee')} value={`-฿${formatCurrency(record.pvfEmployee)}`} negative />
                        <DetailItem label={t('employee.detail.ssfEmployer')} value={`฿${formatCurrency(record.ssfEmployer)}`} />
                        <DetailItem label={t('employee.detail.pvfEmployer')} value={`฿${formatCurrency(record.pvfEmployer)}`} />
                        <DetailItem label={t('form.netPay')} value={`฿${formatCurrency(record.netPay)}`} bold />
                        <DetailItem label={t('form.paymentMethod')} value={record.paymentMethod || '-'} />
                      </div>
                      {record.paymentDate && (
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-3">
                          {t('employee.detail.paidOn')}: {formatDate(record.paymentDate)}
                        </p>
                      )}
                      {/* Download / Email payslip buttons */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-light dark:border-border-dark">
                        <button
                          onClick={() => handleDownloadPayslip(record.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                        >
                          <Download size={14} />
                          {t('employee.downloadPayslip')}
                        </button>
                        {isAdminView && (
                          <button
                            onClick={() => handleEmailPayslip(record.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                          >
                            <Mail size={14} />
                            {t('admin.actions.emailPayslip')}
                          </button>
                        )}
                      </div>
                      {/* Admin: action buttons */}
                      {isAdminView && record.status !== 'Paid' && record.status !== 'Cancelled' && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-light dark:border-border-dark">
                          {record.status === 'Pending' && (
                            <button
                              onClick={() => openEdit(record)}
                              className="px-3 py-1.5 text-xs font-medium text-text-light dark:text-text-dark bg-background-light dark:bg-background-dark rounded-lg hover:bg-border-light dark:hover:bg-border-dark transition-colors"
                            >
                              {t('admin.actions.editPayroll')}
                            </button>
                          )}
                          {record.status === 'Pending' && (
                            <button
                              onClick={() => handleStatusChange(record.id, 'Processed')}
                              className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                            >
                              {t('admin.actions.markAsProcessed')}
                            </button>
                          )}
                          {(record.status === 'Pending' || record.status === 'Processed') && (
                            <button
                              onClick={() => handleStatusChange(record.id, 'Paid')}
                              className="px-3 py-1.5 text-xs font-medium text-accent-green bg-accent-green/10 rounded-lg hover:bg-accent-green/20 transition-colors"
                            >
                              {t('admin.actions.markAsPaid')}
                            </button>
                          )}
                          <button
                            onClick={() => handleStatusChange(record.id, 'Cancelled')}
                            className="px-3 py-1.5 text-xs font-medium text-accent-red bg-accent-red/10 rounded-lg hover:bg-accent-red/20 transition-colors"
                          >
                            {t('admin.actions.markAsCancelled')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Create Payroll Modal */}
      {showCreate && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border-light dark:border-border-dark">
              <h3 className="text-lg font-bold text-text-light dark:text-text-dark">{t('form.createTitle')}</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors">
                <X size={18} className="text-text-muted-light" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Employee Select */}
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('form.selectEmployee')}</label>
                <SearchableSelect
                  value={createForm.employeeId}
                  onChange={(val) => {
                    setCreateForm((f) => ({ ...f, employeeId: val }));
                    // Auto-fill salary from employee data
                    const emp = allEmployees.find((e) => e.id === val);
                    if (emp?.salary) setCreateForm((f) => ({ ...f, employeeId: val, baseSalary: String(emp.salary) }));
                  }}
                  options={allEmployees.filter((e) => e.status === 'Active').map((e) => ({
                    value: e.id,
                    label: e.name,
                    subtitle: e.department,
                    avatar: e.avatar || undefined,
                  }))}
                  onSearch={() => {}}
                  placeholder={t('form.selectEmployee')}
                />
              </div>
              {/* Period */}
              <div className="grid grid-cols-2 gap-3">
                <DatePicker
                  value={createForm.payPeriodStart}
                  onChange={(date) => setCreateForm((f) => ({ ...f, payPeriodStart: date }))}
                  label={t('form.payPeriodStart')}
                  placeholder={t('form.payPeriodStart')}
                />
                <DatePicker
                  value={createForm.payPeriodEnd}
                  onChange={(date) => setCreateForm((f) => ({ ...f, payPeriodEnd: date }))}
                  label={t('form.payPeriodEnd')}
                  placeholder={t('form.payPeriodEnd')}
                  minDate={createForm.payPeriodStart || undefined}
                />
              </div>
              {/* Amounts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('form.baseSalary')}</label>
                  <input type="number" value={createForm.baseSalary} onChange={(e) => setCreateForm((f) => ({ ...f, baseSalary: e.target.value }))}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('form.overtimeHours')}</label>
                  <input type="number" value={createForm.overtimeHours} onChange={(e) => setCreateForm((f) => ({ ...f, overtimeHours: e.target.value }))}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('form.bonus')}</label>
                <input type="number" value={createForm.bonus} onChange={(e) => setCreateForm((f) => ({ ...f, bonus: e.target.value }))}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary" placeholder="0.00" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('form.leaveDeduction')}</label>
                  <input type="number" value={createForm.leaveDeduction} onChange={(e) => setCreateForm((f) => ({ ...f, leaveDeduction: e.target.value }))}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('form.otherDeductions')}</label>
                  <input type="number" value={createForm.deductions} onChange={(e) => setCreateForm((f) => ({ ...f, deductions: e.target.value }))}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary" placeholder="0.00" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border-light dark:border-border-dark">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors">
                {t('common:buttons.cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={createPayroll.isPending}
                className="px-5 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createPayroll.isPending ? t('form.calculating') : t('admin.actions.createPayroll')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Batch Payroll Modal */}
      {showBatch && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeBatch}>
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border-light dark:border-border-dark">
              <h3 className="text-lg font-bold text-text-light dark:text-text-dark">{t('batch.title')}</h3>
              <button onClick={closeBatch} className="p-1 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors">
                <X size={18} className="text-text-muted-light" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('batch.description')}</p>
              <div className="grid grid-cols-2 gap-3">
                <DatePicker
                  value={batchForm.payPeriodStart}
                  onChange={(date) => setBatchForm((f) => ({ ...f, payPeriodStart: date }))}
                  label={t('form.payPeriodStart')}
                  placeholder={t('form.payPeriodStart')}
                />
                <DatePicker
                  value={batchForm.payPeriodEnd}
                  onChange={(date) => setBatchForm((f) => ({ ...f, payPeriodEnd: date }))}
                  label={t('form.payPeriodEnd')}
                  placeholder={t('form.payPeriodEnd')}
                  minDate={batchForm.payPeriodStart || undefined}
                />
              </div>

              {/* Batch Result */}
              {batchResult && (
                <div className="bg-background-light dark:bg-background-dark rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-accent-green font-medium">{t('batch.created')}: {batchResult.created}</span>
                    <span className="text-accent-orange font-medium">{t('batch.skipped')}: {batchResult.skipped}</span>
                  </div>
                  {batchResult.skippedEmployees.length > 0 && (
                    <div>
                      <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-1">{t('batch.skippedList')}:</p>
                      <ul className="text-xs text-text-muted-light dark:text-text-muted-dark space-y-0.5">
                        {batchResult.skippedEmployees.map((name, i) => (
                          <li key={i}>- {name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border-light dark:border-border-dark">
              <button onClick={closeBatch} className="px-4 py-2 text-sm font-medium text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors">
                {batchResult ? t('common:buttons.close') : t('common:buttons.cancel')}
              </button>
              {!batchResult && (
                <button
                  onClick={handleBatchCreate}
                  disabled={batchCreatePayroll.isPending}
                  className="px-5 py-2 text-sm font-medium bg-accent-green text-white rounded-lg hover:bg-accent-green/90 transition-colors disabled:opacity-50"
                >
                  {batchCreatePayroll.isPending ? t('form.calculating') : t('batch.generate')}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Payroll Settings Modal */}
      {showSettings && settingsForm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeSettings}>
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border-light dark:border-border-dark">
              <h3 className="text-lg font-bold text-text-light dark:text-text-dark">{t('settings.title')}</h3>
              <button onClick={closeSettings} className="p-1 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors">
                <X size={18} className="text-text-muted-light" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* Standard Hours */}
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('settings.standardHours')}</label>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-2">{t('settings.standardHoursDesc')}</p>
                <input
                  type="number"
                  value={settingsForm.standardHoursPerMonth}
                  onChange={(e) => setSettingsForm((f) => f ? { ...f, standardHoursPerMonth: parseFloat(e.target.value) || 0 } : f)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Personal Allowance */}
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('settings.personalAllowance')}</label>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-2">{t('settings.personalAllowanceDesc')}</p>
                <input
                  type="number"
                  value={settingsForm.personalAllowance}
                  onChange={(e) => setSettingsForm((f) => f ? { ...f, personalAllowance: parseFloat(e.target.value) || 0 } : f)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Expense Deduction */}
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('settings.expenseDeduction')}</label>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-2">{t('settings.expenseDeductionDesc')}</p>
                <input
                  type="number"
                  value={settingsForm.expenseDeduction}
                  onChange={(e) => setSettingsForm((f) => f ? { ...f, expenseDeduction: parseFloat(e.target.value) || 0 } : f)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* SSF Rate */}
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('settings.ssfRate')}</label>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-2">{t('settings.ssfRateDesc')}</p>
                <input
                  type="number"
                  step="0.01"
                  value={settingsForm.ssfRate}
                  onChange={(e) => setSettingsForm((f) => f ? { ...f, ssfRate: parseFloat(e.target.value) || 0 } : f)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* SSF Max Base */}
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('settings.ssfMaxBase')}</label>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-2">{t('settings.ssfMaxBaseDesc')}</p>
                <input
                  type="number"
                  value={settingsForm.ssfMaxBase}
                  onChange={(e) => setSettingsForm((f) => f ? { ...f, ssfMaxBase: parseFloat(e.target.value) || 0 } : f)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* PVF Employee Rate */}
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('settings.pvfEmployeeRate')}</label>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-2">{t('settings.pvfEmployeeRateDesc')}</p>
                <input
                  type="number"
                  step="0.01"
                  value={settingsForm.pvfEmployeeRate}
                  onChange={(e) => setSettingsForm((f) => f ? { ...f, pvfEmployeeRate: parseFloat(e.target.value) || 0 } : f)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* PVF Employer Rate */}
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('settings.pvfEmployerRate')}</label>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-2">{t('settings.pvfEmployerRateDesc')}</p>
                <input
                  type="number"
                  step="0.01"
                  value={settingsForm.pvfEmployerRate}
                  onChange={(e) => setSettingsForm((f) => f ? { ...f, pvfEmployerRate: parseFloat(e.target.value) || 0 } : f)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Tax Brackets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark">{t('settings.taxBrackets')}</label>
                  <button
                    onClick={() => {
                      const brackets = [...settingsForm.taxBrackets];
                      const lastBracket = brackets[brackets.length - 1];
                      const lastMax = lastBracket ? lastBracket.max : 0;
                      brackets.push({ min: lastMax === -1 ? 0 : lastMax, max: -1, rate: 0 });
                      setSettingsForm((f) => f ? { ...f, taxBrackets: brackets } : f);
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <PlusCircle size={14} />
                    {t('settings.addBracket')}
                  </button>
                </div>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-3">{t('settings.taxBracketsDesc')}</p>
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 text-xs font-medium text-text-muted-light dark:text-text-muted-dark">
                    <span>{t('settings.bracketMin')}</span>
                    <span>{t('settings.bracketMax')}</span>
                    <span>{t('settings.bracketRate')}</span>
                    <span></span>
                  </div>
                  {settingsForm.taxBrackets.map((bracket, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2">
                      <input
                        type="number"
                        value={bracket.min}
                        onChange={(e) => {
                          const brackets = settingsForm.taxBrackets.map((b, i) =>
                            i === idx ? { min: parseFloat(e.target.value) || 0, max: b.max, rate: b.rate } : b
                          );
                          setSettingsForm((f) => f ? { ...f, taxBrackets: brackets } : f);
                        }}
                        className="px-2 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded text-xs text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        type="number"
                        value={bracket.max}
                        onChange={(e) => {
                          const brackets = settingsForm.taxBrackets.map((b, i) =>
                            i === idx ? { min: b.min, max: parseFloat(e.target.value) || 0, rate: b.rate } : b
                          );
                          setSettingsForm((f) => f ? { ...f, taxBrackets: brackets } : f);
                        }}
                        placeholder="-1 = unlimited"
                        className="px-2 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded text-xs text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={bracket.rate}
                        onChange={(e) => {
                          const brackets = settingsForm.taxBrackets.map((b, i) =>
                            i === idx ? { min: b.min, max: b.max, rate: parseFloat(e.target.value) || 0 } : b
                          );
                          setSettingsForm((f) => f ? { ...f, taxBrackets: brackets } : f);
                        }}
                        className="px-2 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded text-xs text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        onClick={() => {
                          const brackets = settingsForm.taxBrackets.filter((_, i) => i !== idx);
                          setSettingsForm((f) => f ? { ...f, taxBrackets: brackets } : f);
                        }}
                        className="p-1 text-accent-red hover:bg-accent-red/10 rounded transition-colors self-center"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border-light dark:border-border-dark">
              <button onClick={closeSettings} className="px-4 py-2 text-sm font-medium text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors">
                {t('common:buttons.cancel')}
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={updatePayrollSettings.isPending}
                className="px-5 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {updatePayrollSettings.isPending ? t('form.calculating') : t('settings.save')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Payroll Modal */}
      {editingRecord && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditingRecord(null)}>
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border-light dark:border-border-dark">
              <h3 className="text-lg font-bold text-text-light dark:text-text-dark">{t('form.editTitle')}</h3>
              <button onClick={() => setEditingRecord(null)} className="p-1 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors">
                <X size={18} className="text-text-muted-light" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('form.baseSalary')}</label>
                  <input type="number" value={editForm.baseSalary} onChange={(e) => setEditForm((f) => ({ ...f, baseSalary: e.target.value }))}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('form.overtimeHours')}</label>
                  <input type="number" value={editForm.overtimeHours} onChange={(e) => setEditForm((f) => ({ ...f, overtimeHours: e.target.value }))}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('form.bonus')}</label>
                <input type="number" value={editForm.bonus} onChange={(e) => setEditForm((f) => ({ ...f, bonus: e.target.value }))}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('form.leaveDeduction')}</label>
                  <input type="number" value={editForm.leaveDeduction} onChange={(e) => setEditForm((f) => ({ ...f, leaveDeduction: e.target.value }))}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('form.otherDeductions')}</label>
                  <input type="number" value={editForm.deductions} onChange={(e) => setEditForm((f) => ({ ...f, deductions: e.target.value }))}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('form.autoCalculated')}</p>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border-light dark:border-border-dark">
              <button onClick={() => setEditingRecord(null)} className="px-4 py-2 text-sm font-medium text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors">
                {t('common:buttons.cancel')}
              </button>
              <button
                onClick={handleEdit}
                disabled={updatePayroll.isPending}
                className="px-5 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {updatePayroll.isPending ? t('form.calculating') : t('form.save')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
const SummaryCard: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string }> = ({ icon, label, value, color }) => (
  <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4">
    <div className={`inline-flex p-2 rounded-lg mb-2 ${color}`}>{icon}</div>
    <p className="text-xl font-bold text-text-light dark:text-text-dark">{value}</p>
    <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{label}</p>
  </div>
);

const DetailItem: React.FC<{ label: string; value: string; positive?: boolean; negative?: boolean; bold?: boolean }> = ({ label, value, positive, negative, bold }) => (
  <div>
    <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{label}</p>
    <p className={`text-sm mt-0.5 ${
      bold ? 'font-bold text-text-light dark:text-text-dark' :
      positive ? 'text-accent-green font-medium' :
      negative ? 'text-accent-red font-medium' :
      'text-text-light dark:text-text-dark'
    }`}>
      {value}
    </p>
  </div>
);
