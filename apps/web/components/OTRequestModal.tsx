import React, { useState, useEffect } from 'react';
import { X, Clock, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCreateOTRequest } from '../hooks/queries';

interface Props {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const OTRequestModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const { t } = useTranslation(['leave']);
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [plannedStart, setPlannedStart] = useState('18:00');
  const [plannedEnd, setPlannedEnd] = useState('20:00');
  const [otType, setOtType] = useState<'regular' | 'holiday'>('regular');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const createMutation = useCreateOTRequest();

  const plannedHours = (() => {
    if (!plannedStart || !plannedEnd) return 0;
    const parts = (s: string) => { const [h = 0, m = 0] = s.split(':').map(Number); return h * 60 + m; };
    const diff = parts(plannedEnd) - parts(plannedStart);
    return diff > 0 ? Math.round(diff / 60 * 100) / 100 : 0;
  })();

  useEffect(() => {
    setError('');
  }, [date, plannedStart, plannedEnd, reason]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { setError(t('otModal.errorNoReason')); return; }
    if (plannedHours <= 0) { setError(t('otModal.errorEndTime')); return; }
    if (plannedHours > 12) { setError(t('otModal.errorMaxHours')); return; }

    createMutation.mutate(
      { date, plannedStart, plannedEnd, plannedHours, otType, reason: reason.trim() },
      {
        onSuccess: () => onSuccess(t('otModal.success')),
        onError: (err: any) => setError(err?.response?.data?.error || err?.message || t('otModal.failedSubmit')),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
              <Clock size={18} />
            </div>
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{t('otModal.title')}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-text-muted-light dark:text-text-muted-dark">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">{t('otModal.date')}</label>
            <input
              type="date"
              value={date}
              min={sevenDaysAgo}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">{t('otModal.startTime')}</label>
              <input
                type="time"
                value={plannedStart}
                onChange={(e) => setPlannedStart(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">{t('otModal.endTime')}</label>
              <input
                type="time"
                value={plannedEnd}
                onChange={(e) => setPlannedEnd(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Planned hours display */}
          {plannedHours > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
              <Clock size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <span className="font-semibold">{plannedHours.toFixed(1)}h</span> {t('otModal.plannedHours')}
              </p>
            </div>
          )}

          {/* OT Type */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">{t('otModal.otType')}</label>
            <div className="grid grid-cols-2 gap-2">
              {(['regular', 'holiday'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setOtType(type)}
                  className={`px-3 py-2.5 text-sm font-medium rounded-lg border transition-all text-left ${
                    otType === type
                      ? 'bg-primary/10 border-primary text-primary dark:bg-primary/20'
                      : 'border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark hover:border-primary/50'
                  }`}
                >
                  <p className="font-semibold capitalize">{type}</p>
                  <p className="text-xs opacity-75">{t(`otModal.${type}Rate`)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">
              {t('otModal.reason')} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('otModal.reasonPlaceholder')}
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
              {t('otModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !reason.trim() || plannedHours <= 0}
              className="flex-1 px-4 py-2.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {createMutation.isPending ? t('otModal.submitting') : t('otModal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
