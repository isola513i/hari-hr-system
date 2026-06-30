import React, { useState, useEffect } from 'react';
import { X, ClipboardClock, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCreateRegularizationRequest, useHolidayDateSet, useEmployeeDetail } from '../hooks/queries';
import { useAuth } from '../contexts/AuthContext';
import { DatePicker } from './DatePicker';

interface Props {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];

/** Combine a yyyy-mm-dd date and an HH:mm time into an ISO string at +07:00 (Thai time). */
const toIso = (date: string, time: string): string | undefined => {
  if (!time) return undefined;
  return new Date(`${date}T${time}:00+07:00`).toISOString();
};

export const AttendanceRegularizationModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const { t } = useTranslation(['leave']);
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [clockIn, setClockIn] = useState('09:00');
  const [clockOut, setClockOut] = useState('18:00');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const { user } = useAuth();
  const { data: me } = useEmployeeDetail(user?.employeeId ?? user?.id);
  const workDays = me?.workDays?.length ? me.workDays : DEFAULT_WORK_DAYS;
  // Weekdays the employee does NOT work — blocked in the picker
  const offWeekdays = ALL_WEEKDAYS.filter((d) => !workDays.includes(d));

  const holidayDates = useHolidayDateSet();
  const createMutation = useCreateRegularizationRequest();

  useEffect(() => {
    setError('');
  }, [date, clockIn, clockOut, reason]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { setError(t('regModal.errorNoReason')); return; }
    if (!clockIn && !clockOut) { setError(t('regModal.errorNoTime')); return; }
    const dow = new Date(date + 'T00:00:00').getDay();
    if (!workDays.includes(dow)) { setError(t('regModal.errorNonWorkingDay')); return; }
    if (holidayDates.has(date)) { setError(t('regModal.errorHoliday')); return; }

    createMutation.mutate(
      {
        date,
        requestedClockIn: toIso(date, clockIn),
        requestedClockOut: toIso(date, clockOut),
        reason: reason.trim(),
      },
      {
        onSuccess: () => onSuccess(t('regModal.success')),
        onError: (err: any) => setError(err?.response?.data?.error || err?.message || t('regModal.failedSubmit')),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg">
              <ClipboardClock size={18} />
            </div>
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{t('regModal.title')}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-text-muted-light dark:text-text-muted-dark">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('regModal.subtitle')}</p>

          {/* Date — custom picker; past 30 days up to today, days-off + holidays blocked */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">{t('regModal.date')}</label>
            <DatePicker
              value={date}
              onChange={setDate}
              minDate={thirtyDaysAgo}
              maxDate={today}
              disabledWeekdays={offWeekdays}
              disabledDates={holidayDates}
            />
            <p className="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">{t('regModal.holidayHint')}</p>
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">{t('regModal.clockIn')}</label>
              <input
                type="time"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">{t('regModal.clockOut')}</label>
              <input
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">
              {t('regModal.reason')} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('regModal.reasonPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
              <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {t('regModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !reason.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {createMutation.isPending ? t('regModal.submitting') : t('regModal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
