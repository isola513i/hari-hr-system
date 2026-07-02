import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  useLeaveBalance,
  useAddLeaveRequestWithFile,
  useEditLeaveRequest,
  useLeaveRequestById,
  useEmployeeSearch,
  useLeaveRequests,
  useLeaveTypeConfig,
} from '../hooks/queries';
import { resolveAvatarUrl } from '../lib/api';
import { getErrorMessage } from '../lib/errorHandler';
import { Dropdown } from '../components/Dropdown';
import { DatePicker } from '../components/DatePicker';
import { FileUpload } from '../components/FileUpload';
import { SearchableSelect } from '../components/SearchableSelect';
import type { SearchableSelectOption } from '../components/SearchableSelect';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { LeaveBalance } from '../types';
import { buildLeaveOptions, requiresMedicalCert, getLeaveColor, translateLeaveType } from '../lib/leaveTypeConfig';

interface FormState {
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  handoverEmployeeId: string;
  handoverNotes: string;
  medicalCertificate: File | null;
  isHalfDay: boolean;
  halfDayPeriod: 'morning' | 'afternoon' | '';
}

const initialForm: FormState = {
  type: 'Vacation',
  startDate: '',
  endDate: '',
  reason: '',
  handoverEmployeeId: '',
  handoverNotes: '',
  medicalCertificate: null,
  isHalfDay: false,
  halfDayPeriod: '',
};

const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-yellow-500',
  Approved: 'bg-green-500',
  Rejected: 'bg-red-500',
  'Cancel Requested': 'bg-orange-500',
};

export function LeaveRequestForm() {
  const { t } = useTranslation(['leave', 'common']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isEditMode = Boolean(id);

  const [form, setForm] = useState<FormState>(initialForm);
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Queries
  const { data: leaveConfigs = [] } = useLeaveTypeConfig();
  const LEAVE_OPTIONS = useMemo(() => buildLeaveOptions(leaveConfigs), [leaveConfigs]);
  const { data: balances = [], isPending: balanceLoading } = useLeaveBalance(user?.employeeId);
  const { data: existingRequest, isPending: requestLoading } = useLeaveRequestById(id);
  const { data: leaveRequests = [], isPending: requestsLoading } = useLeaveRequests();
  const { data: employees = [], isPending: isSearching } = useEmployeeSearch(employeeSearch);

  // Mutations
  const addLeaveRequest = useAddLeaveRequestWithFile();
  const editLeaveRequest = useEditLeaveRequest();

  // Sync default type with first available config
  useEffect(() => {
    if (!isEditMode && leaveConfigs.length > 0 && !leaveConfigs.some((c) => c.type === form.type)) {
      setForm((p) => ({ ...p, type: leaveConfigs[0]!.type }));
    }
  }, [leaveConfigs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill form in edit mode
  useEffect(() => {
    if (isEditMode && existingRequest) {
      // Ensure dates are YYYY-MM-DD for the DatePicker
      const toDateStr = (d: string) => (d ? d.split('T')[0] ?? d : '');
      setForm({
        type: existingRequest.type,
        startDate: toDateStr(existingRequest.startDate),
        endDate: toDateStr(existingRequest.endDate),
        reason: existingRequest.reason || '',
        handoverEmployeeId: existingRequest.handoverEmployeeId || '',
        handoverNotes: existingRequest.handoverNotes || '',
        medicalCertificate: null,
        isHalfDay: existingRequest.isHalfDay || false,
        halfDayPeriod: existingRequest.halfDayPeriod || '',
      });
    }
  }, [isEditMode, existingRequest]);

  // Calculate business days (excluding weekends and holidays) via API
  const [dayCount, setDayCount] = useState(0);
  useEffect(() => {
    if (!form.startDate || !form.endDate) { setDayCount(0); return; }
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (end < start) { setDayCount(0); return; }
    if (form.isHalfDay && form.startDate === form.endDate) { setDayCount(0.5); return; }
    let cancelled = false;
    (async () => {
      try {
        const { api } = await import('../lib/api');
        const result = await api.get<{ days: number }>(`/holidays/calculate-days?start=${form.startDate}&end=${form.endDate}`);
        if (!cancelled) setDayCount(result.days);
      } catch {
        if (!cancelled) setDayCount(Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      }
    })();
    return () => { cancelled = true; };
  }, [form.startDate, form.endDate, form.isHalfDay]);

  // Auto-disable half-day when date range is multi-day
  useEffect(() => {
    if (form.isHalfDay && form.startDate && form.endDate && form.startDate !== form.endDate) {
      setForm(prev => ({ ...prev, isHalfDay: false, halfDayPeriod: '' }));
    }
  }, [form.startDate, form.endDate, form.isHalfDay]);

  // Get current balance for selected type
  const currentBalance: LeaveBalance | undefined = useMemo(
    () => balances.find((b) => b.type === form.type),
    [balances, form.type],
  );

  const isUnlimited = !currentBalance || currentBalance.total === -1;
  const remaining = currentBalance?.remaining ?? 0;
  const quotaExceeded = !isUnlimited && dayCount > 0 && dayCount > remaining;
  const needsMedicalCert = requiresMedicalCert(form.type, dayCount);

  // Employee options for SearchableSelect
  const employeeOptions: SearchableSelectOption[] = useMemo(
    () =>
      employees.map((e) => ({
        value: e.id,
        label: e.name,
        avatar: resolveAvatarUrl(e.avatar, e.name),
        subtitle: e.department,
      })),
    [employees],
  );

  const handleEmployeeSearch = useCallback((q: string) => {
    setEmployeeSearch(q);
  }, []);

  // My recent requests (last 5)
  const recentRequests = useMemo(() => {
    if (!leaveRequests.length || !user?.employeeId) return [];
    return leaveRequests
      .filter((r) => r.employeeId === user.employeeId)
      .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''))
      .slice(0, 5);
  }, [leaveRequests, user?.employeeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.startDate || !form.endDate) {
      showToast(t('leave:requestForm.selectDates'), 'error');
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      showToast(t('leave:requestModal.endAfterStart'), 'error');
      return;
    }
    if (quotaExceeded) {
      showToast(t('leave:requestForm.insufficientBalance', { remaining }), 'error');
      return;
    }
    if (needsMedicalCert && !form.medicalCertificate && !isEditMode) {
      showToast(
        form.type === 'Maternity Leave'
          ? t('leave:requestForm.medicalRequired')
          : t('leave:requestForm.medicalRequiredSick'),
        'error',
      );
      return;
    }

    const formData = new FormData();
    if (!isEditMode) {
      formData.append('employeeId', user?.employeeId || '');
    }
    formData.append('type', form.type);
    formData.append('startDate', form.startDate);
    formData.append('endDate', form.endDate);
    if (form.reason) formData.append('reason', form.reason);
    if (form.handoverEmployeeId) formData.append('handoverEmployeeId', form.handoverEmployeeId);
    if (form.handoverNotes) formData.append('handoverNotes', form.handoverNotes);
    if (form.medicalCertificate) formData.append('medicalCertificate', form.medicalCertificate);
    formData.append('isHalfDay', String(form.isHalfDay));
    if (form.isHalfDay && form.halfDayPeriod) formData.append('halfDayPeriod', form.halfDayPeriod);

    try {
      if (isEditMode) {
        await editLeaveRequest.mutateAsync({ id: id!, formData });
        showToast(t('leave:requestForm.updateSuccess'), 'success');
      } else {
        await addLeaveRequest.mutateAsync(formData);
        showToast(t('leave:requestForm.submitSuccess'), 'success');
      }
      navigate('/time-off');
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to submit leave request'), 'error');
    }
  };

  if (balanceLoading || (isEditMode && requestLoading)) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN - Main Form */}
        <div className="lg:col-span-2">
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-6">
            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-6">
              {isEditMode ? t('leave:requestForm.editTitle') : t('leave:requestForm.newTitle')}
            </h2>

            {/* Warning for editing approved request */}
            {isEditMode && existingRequest?.status === 'Approved' && (
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-amber-800 dark:text-amber-200 text-sm">
                  {t('leave:requestForm.editWarning')}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Leave Type */}
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                  {t('leave:requestForm.leaveType')} <span className="text-red-500">*</span>
                </label>
                <Dropdown
                  options={LEAVE_OPTIONS}
                  value={form.type}
                  onChange={(value) => setForm((prev) => ({
                    ...prev,
                    type: value,
                    medicalCertificate: (value !== 'Sick Leave' && value !== 'Maternity Leave') ? null : prev.medicalCertificate,
                  }))}
                  placeholder={t('leave:requestForm.selectType')}
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                    {t('leave:requestForm.fromDate')} <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={form.startDate}
                    onChange={(value) => setForm({ ...form, startDate: value })}
                    minDate={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                    {t('leave:requestForm.toDate')} <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={form.endDate}
                    onChange={(value) => setForm({ ...form, endDate: value })}
                    minDate={form.startDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              {/* Half-day toggle — only when single-day */}
              {form.startDate && form.endDate && form.startDate === form.endDate && (
                <div className="rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-light dark:text-text-dark">
                      {t('leave:halfDay.label')}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.isHalfDay}
                      onClick={() => setForm({ ...form, isHalfDay: !form.isHalfDay, halfDayPeriod: !form.isHalfDay ? 'morning' : '' })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        form.isHalfDay ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          form.isHalfDay ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  {form.isHalfDay && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, halfDayPeriod: 'morning' })}
                        className={`flex flex-col items-center gap-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                          form.halfDayPeriod === 'morning'
                            ? 'border-primary bg-primary/5 text-primary dark:bg-primary/10'
                            : 'border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <span className="text-lg">🌅</span>
                        <span>{t('leave:halfDay.morning')}</span>
                        <span className="text-[11px] font-normal text-text-muted-light dark:text-text-muted-dark">09:00 – 12:00</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, halfDayPeriod: 'afternoon' })}
                        className={`flex flex-col items-center gap-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                          form.halfDayPeriod === 'afternoon'
                            ? 'border-primary bg-primary/5 text-primary dark:bg-primary/10'
                            : 'border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <span className="text-lg">🌇</span>
                        <span>{t('leave:halfDay.afternoon')}</span>
                        <span className="text-[11px] font-normal text-text-muted-light dark:text-text-muted-dark">13:00 – 18:00</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Total Duration + Quota */}
              {dayCount > 0 && (
                <div className="w-full max-w-full overflow-hidden rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-text-light dark:text-text-dark shrink-0">
                      {t('leave:requestForm.totalDuration')}
                    </span>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium shrink-0 ${
                        quotaExceeded
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
                      }`}
                    >
                      {dayCount} {dayCount === 1 ? t('leave:requestForm.day') : t('leave:requestForm.days')}
                    </span>
                    {quotaExceeded && (
                      <span className="text-sm text-red-600 dark:text-red-400 min-w-0 break-words">
                        {t('leave:requestForm.exceedsBalance')}
                      </span>
                    )}
                  </div>

                  {/* Quota bar */}
                  {currentBalance && !isUnlimited && (
                    <div className="min-w-0">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-text-muted-light dark:text-text-muted-dark">
                          {t('leave:requestForm.available', { remaining, total: currentBalance.total })}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            quotaExceeded
                              ? 'bg-red-500'
                              : remaining / currentBalance.total < 0.3
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{
                            width: `${Math.min((remaining / currentBalance.total) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reason */}
              <div>
                <label htmlFor="leave-reason" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                  {t('leave:requestForm.reason')}
                </label>
                <textarea
                  id="leave-reason"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  maxLength={500}
                  rows={4}
                  className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  placeholder={t('leave:requestForm.reasonPlaceholder')}
                />
                <div className="text-right text-xs text-text-muted-light dark:text-text-muted-dark mt-1">
                  {t('leave:requestForm.charCount', { count: form.reason.length })}
                </div>
              </div>

              {/* Medical Certificate */}
              {needsMedicalCert && (
                <div>
                  <FileUpload
                    value={form.medicalCertificate}
                    onChange={(file) => setForm({ ...form, medicalCertificate: file })}
                    accept=".pdf,.jpg,.jpeg,.png"
                    maxSizeMB={10}
                    label={t('leave:requestForm.medicalCert')}
                    required
                  />
                  {isEditMode && existingRequest?.medicalCertificatePath && !form.medicalCertificate && (
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">
                      {t('leave:requestForm.certUploaded')}
                    </p>
                  )}
                </div>
              )}

              {/* Handover Person */}
              <div>
                <SearchableSelect
                  value={form.handoverEmployeeId}
                  onChange={(value) => setForm({ ...form, handoverEmployeeId: value })}
                  options={employeeOptions}
                  onSearch={handleEmployeeSearch}
                  isLoading={isSearching}
                  placeholder={t('leave:requestForm.searchEmployee')}
                  label={t('leave:requestForm.handoverPerson')}
                  excludeValues={user?.employeeId ? [user.employeeId] : []}
                />
              </div>

              {/* Handover Notes */}
              {form.handoverEmployeeId && (
                <div>
                  <label htmlFor="leave-handoverNotes" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                    {t('leave:requestModal.handoverNotes')}
                  </label>
                  <textarea
                    id="leave-handoverNotes"
                    value={form.handoverNotes}
                    onChange={(e) => setForm({ ...form, handoverNotes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    placeholder={t('leave:requestForm.handoverPlaceholder')}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border-light dark:border-border-dark">
                <button
                  type="button"
                  onClick={() => navigate('/time-off')}
                  className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {t('leave:requestForm.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={addLeaveRequest.isPending || editLeaveRequest.isPending || quotaExceeded}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addLeaveRequest.isPending || editLeaveRequest.isPending
                    ? t('common:buttons.submitting')
                    : isEditMode
                    ? t('leave:requestForm.update')
                    : t('leave:requestForm.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN - Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Current Balance Card */}
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-6">
            <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4">
              {t('leave:requestForm.currentBalance')}
            </h3>
            {balances.length > 0 ? (
              <div className="space-y-4">
                {balances.map((bal) => {
                  const isUnlimitedBal = bal.total === -1;
                  const pct = isUnlimitedBal
                    ? 100
                    : bal.total > 0
                    ? Math.min((bal.remaining / bal.total) * 100, 100)
                    : 0;
                  const colorClass = getLeaveColor(bal.type, leaveConfigs).barFill;

                  return (
                    <div key={bal.type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-light dark:text-text-dark">{translateLeaveType(bal.type)}</span>
                        <span className="font-medium text-text-light dark:text-text-dark">
                          {isUnlimitedBal ? t('leave:requestForm.unlimited') : `${bal.remaining} / ${bal.total}`}
                        </span>
                      </div>
                      {!isUnlimitedBal && (
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`${colorClass} h-2 rounded-full transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                {t('leave:requestForm.noBalanceData')}
              </p>
            )}
            <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-4">
              {t('leave:requestForm.balanceNote')}
            </p>
          </div>

          {/* Recent Requests Card */}
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-6">
            <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4">
              {t('leave:requestForm.recentRequests')}
            </h3>
            {requestsLoading ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner />
              </div>
            ) : recentRequests.length > 0 ? (
              <div className="space-y-3">
                {recentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark"
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        STATUS_COLORS[req.status] || 'bg-gray-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">
                        {translateLeaveType(req.type)}
                      </p>
                      <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
                        {req.dates}
                      </p>
                      <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">
                        {t(`common:status.${req.status === 'Cancel Requested' ? 'cancelRequested' : req.status.toLowerCase()}`, { defaultValue: req.status })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                {t('leave:requestForm.noRecentRequests')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
