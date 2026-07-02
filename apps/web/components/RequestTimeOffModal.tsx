import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Dropdown } from './Dropdown';
import { DatePicker } from './DatePicker';
import { FileUpload } from './FileUpload';
import { SearchableSelect } from './SearchableSelect';
import type { SearchableSelectOption } from './SearchableSelect';
import { useLeaveBalance, useEmployeeSearch, useLeaveTypeConfig } from '../hooks/queries';
import { resolveAvatarUrl } from '../lib/api';
import { buildLeaveOptions, requiresMedicalCert, showMedicalCertUpload } from '../lib/leaveTypeConfig';
import { getErrorMessage } from '../lib/errorHandler';
import type { LeaveBalance } from '../types';

interface RequestTimeOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  isPending?: boolean;
  employeeId: string;
}

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

export const RequestTimeOffModal: React.FC<RequestTimeOffModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isPending = false,
  employeeId,
}) => {
  const { t } = useTranslation(['leave', 'common']);
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Queries
  const { data: balances = [] } = useLeaveBalance(employeeId);
  const { data: employees = [], isPending: isSearching } = useEmployeeSearch(employeeSearch);
  const { data: leaveConfigs = [] } = useLeaveTypeConfig();
  const LEAVE_OPTIONS = useMemo(() => buildLeaveOptions(leaveConfigs), [leaveConfigs]);

  // Sync default type with first available config
  useEffect(() => {
    if (leaveConfigs.length > 0 && !leaveConfigs.some((c) => c.type === form.type)) {
      setForm((p) => ({ ...p, type: leaveConfigs[0]!.type }));
    }
  }, [leaveConfigs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate business days via API (excluding weekends and holidays)
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

  const currentBalance: LeaveBalance | undefined = useMemo(
    () => balances.find((b) => b.type === form.type),
    [balances, form.type],
  );

  const isUnlimited = !currentBalance || currentBalance.total === -1;
  const remaining = currentBalance?.remaining ?? 0;
  const quotaExceeded = !isUnlimited && dayCount > 0 && dayCount > remaining;

  const needsMedicalCert = requiresMedicalCert(form.type, dayCount);
  const showMedicalUpload = showMedicalCertUpload(form.type);
  const showHandoverNotes = !!form.handoverEmployeeId;

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

  // Handlers
  const handleClose = () => {
    setForm(initialForm);
    setError('');
    setEmployeeSearch('');
    onClose();
  };

  const handleTypeChange = (type: string) => {
    setForm((prev) => ({
      ...prev,
      type,
      // Clear medical cert when switching away from types that require it
      medicalCertificate: (type !== 'Sick Leave' && type !== 'Maternity Leave') ? null : prev.medicalCertificate,
    }));
  };

  const handleEmployeeSearch = useCallback((q: string) => {
    setEmployeeSearch(q);
  }, []);

  const handleSubmit = async () => {
    setError('');

    if (!form.startDate || !form.endDate) {
      setError(t('leave:requestModal.selectDates'));
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setError(t('leave:requestModal.endAfterStart'));
      return;
    }
    if (quotaExceeded) {
      setError(t('leave:requestModal.insufficientBalance', { remaining }));
      return;
    }
    if (needsMedicalCert && !form.medicalCertificate) {
      setError(
        form.type === 'Maternity Leave'
          ? t('leave:requestModal.medicalRequiredMaternity')
          : t('leave:requestModal.medicalRequiredSick'),
      );
      return;
    }

    const formData = new FormData();
    formData.append('employeeId', employeeId);
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
      await onSubmit(formData);
      setForm(initialForm);
    } catch (err) {
      setError(getErrorMessage(err, t('leave:requestModal.submitFailed')));
    }
  };

  // Quota bar
  const quotaPercent = !isUnlimited && currentBalance
    ? Math.min(100, Math.round(((currentBalance.total - remaining) / currentBalance.total) * 100))
    : 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('leave:requestModal.title')} maxWidth="lg">
      <div className="p-6 space-y-4">
        {/* 1. Leave Type */}
        <div>
          <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('leave:requestModal.type')}</label>
          <Dropdown
            value={form.type}
            onChange={handleTypeChange}
            options={LEAVE_OPTIONS}
            placeholder={t('leave:requestForm.selectType')}
          />
        </div>

        {/* 2. Date pickers + day count badge */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DatePicker
            label={t('leave:requestModal.startDate')}
            value={form.startDate}
            onChange={(date) => setForm((p) => ({ ...p, startDate: date }))}
            placeholder={t('leave:requestModal.selectStartDate')}
          />
          <DatePicker
            label={t('leave:requestModal.endDate')}
            value={form.endDate}
            onChange={(date) => setForm((p) => ({ ...p, endDate: date }))}
            placeholder={t('leave:requestModal.selectEndDate')}
            minDate={form.startDate}
          />
        </div>

        {/* Half-day toggle — only when single-day */}
        {form.startDate && form.endDate && form.startDate === form.endDate && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isHalfDay}
                onChange={(e) => setForm((p) => ({ ...p, isHalfDay: e.target.checked, halfDayPeriod: e.target.checked ? 'morning' : '' }))}
                className="w-4 h-4 text-primary border-border-light dark:border-border-dark rounded focus:ring-primary"
              />
              <span className="text-sm font-medium text-text-light dark:text-text-dark">
                {t('leave:halfDay.label')}
              </span>
            </label>
            {form.isHalfDay && (
              <div className="flex gap-4 ml-6">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="modalHalfDayPeriod"
                    value="morning"
                    checked={form.halfDayPeriod === 'morning'}
                    onChange={() => setForm((p) => ({ ...p, halfDayPeriod: 'morning' }))}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm text-text-light dark:text-text-dark">{t('leave:halfDay.morning')}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="modalHalfDayPeriod"
                    value="afternoon"
                    checked={form.halfDayPeriod === 'afternoon'}
                    onChange={() => setForm((p) => ({ ...p, halfDayPeriod: 'afternoon' }))}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm text-text-light dark:text-text-dark">{t('leave:halfDay.afternoon')}</span>
                </label>
              </div>
            )}
          </div>
        )}

        {dayCount > 0 && (
          <div className={`text-sm rounded-lg px-3 py-2 font-medium ${
            quotaExceeded
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
          }`}>
            {dayCount} {dayCount === 1 ? t('common:time.day') : t('common:time.days')} {t('leave:requestModal.requested')}
            {quotaExceeded && ` — ${t('leave:requestModal.exceedsBalance')}`}
          </div>
        )}

        {/* 3. Quota balance indicator */}
        {!isUnlimited && currentBalance && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted-light dark:text-text-muted-dark">
                {t('leave:requestModal.balance', { type: form.type })}
              </span>
              <span className={`font-medium ${
                remaining <= 0 ? 'text-red-600 dark:text-red-400' : 'text-text-light dark:text-text-dark'
              }`}>
                {t('leave:requestModal.remaining', { remaining, total: currentBalance.total })}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  quotaExceeded ? 'bg-red-500' :
                  quotaPercent > 75 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${quotaPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* 4. Reason */}
        <div>
          <label htmlFor="rto-reason" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('leave:requestModal.reason')}</label>
          <textarea
            id="rto-reason"
            rows={3}
            value={form.reason}
            onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
            className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm resize-none text-text-light dark:text-text-dark"
            placeholder={t('leave:requestModal.reasonPlaceholder')}
          />
        </div>

        {/* 5. Medical Certificate — required for Maternity, optional for Sick Leave */}
        {showMedicalUpload && (
          <FileUpload
            label={needsMedicalCert ? t('leave:requestModal.medicalCert') : t('leave:requestModal.medicalCertOptional')}
            value={form.medicalCertificate}
            onChange={(file) => setForm((p) => ({ ...p, medicalCertificate: file }))}
            accept=".pdf,.jpg,.jpeg,.png"
            maxSizeMB={10}
            required={needsMedicalCert}
            error={needsMedicalCert && !form.medicalCertificate && error.includes('medical') ? error : undefined}
          />
        )}

        {/* 6. Handover Person — optional */}
        <SearchableSelect
          label={t('leave:requestModal.handoverPerson')}
          value={form.handoverEmployeeId}
          onChange={(val) => setForm((p) => ({ ...p, handoverEmployeeId: val, handoverNotes: val ? p.handoverNotes : '' }))}
          options={employeeOptions}
          onSearch={handleEmployeeSearch}
          isLoading={isSearching}
          placeholder={t('leave:requestModal.handoverPlaceholder')}
          excludeValues={[employeeId]}
        />

        {/* 7. Handover Notes — conditional: only when handover person selected */}
        {showHandoverNotes && (
          <div>
            <label htmlFor="rto-handoverNotes" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('leave:requestModal.handoverNotes')}</label>
            <textarea
              id="rto-handoverNotes"
              rows={3}
              value={form.handoverNotes}
              onChange={(e) => setForm((p) => ({ ...p, handoverNotes: e.target.value }))}
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm resize-none text-text-light dark:text-text-dark"
              placeholder={t('leave:requestModal.handoverNotesPlaceholder')}
              maxLength={2000}
            />
          </div>
        )}

        {/* Error message */}
        {error && !error.includes('medical') && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm text-text-muted-light hover:text-text-light dark:hover:text-text-dark transition-colors"
          >
            {t('leave:requestModal.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || quotaExceeded}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? t('common:buttons.submitting') : t('leave:requestModal.submit')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
