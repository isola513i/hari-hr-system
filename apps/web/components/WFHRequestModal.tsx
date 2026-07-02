import { useState } from 'react';
import { Home, FileText, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { DatePicker } from './DatePicker';
import { useCreateWFHRequest, useMyWFHRequests } from '../hooks/queries';

interface WFHRequestItem {
  id: string;
  date: string;
  reason: string | null;
  status: string;
  createdAt: string;
}

interface Props {
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  approved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

function formatWFHDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' });
}

export function WFHRequestModal({ onClose, onSuccess }: Props) {
  const { t } = useTranslation(['leave']);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState('');
  const [tab, setTab] = useState<'new' | 'history'>('new');

  const createMutation = useCreateWFHRequest();
  const { data: myRequestsRaw = [] } = useMyWFHRequests();
  const myRequests = myRequestsRaw as WFHRequestItem[];

  const handleSubmit = async () => {
    try {
      await createMutation.mutateAsync({ date, reason: reason.trim() || undefined });
      setReason('');
      setTab('history');
      onSuccess(t('wfhModal.success'));
    } catch (error) {
      // error shown inline via mutation state
    }
  };

  const errorMsg = createMutation.error instanceof Error
    ? createMutation.error.message
    : createMutation.isError ? t('wfhModal.failedSubmit') : null;

  return (
    <Modal isOpen onClose={onClose} title={t('wfhModal.title')} maxWidth="sm">
      <div className="p-6 space-y-4">
        {/* Tabs */}
        <div className="flex border-b border-border-light dark:border-border-dark">
          {(['new', 'history'] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === tabKey
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark'
              }`}
            >
              {tabKey === 'new' ? t('wfhModal.newRequest') : t('wfhModal.myRequests')}
            </button>
          ))}
        </div>

        {tab === 'new' ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <DatePicker
                label={t('wfhModal.date')}
                value={date}
                minDate={today}
                onChange={setDate}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="wfh-reason" className="text-sm font-medium text-text-light dark:text-text-dark flex items-center gap-1.5">
                <FileText size={14} /> {t('wfhModal.reason')} <span className="text-text-muted-light dark:text-text-muted-dark font-normal">{t('wfhModal.optional')}</span>
              </label>
              <textarea
                id="wfh-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('wfhModal.reasonPlaceholder')}
                className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>

            {errorMsg && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-text-light dark:text-text-dark border border-border-light dark:border-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {t('wfhModal.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!date || createMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Home size={15} />
                {createMutation.isPending ? t('wfhModal.submitting') : t('wfhModal.submit')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {myRequests.length === 0 ? (
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark text-center py-6">{t('wfhModal.noRequests')}</p>
            ) : (
              myRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-border-light dark:border-border-dark">
                  <div className="flex items-start gap-3">
                    <Clock size={14} className="text-text-muted-light dark:text-text-muted-dark mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-text-light dark:text-text-dark">{formatWFHDate(req.date)}</p>
                      {req.reason && <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{req.reason}</p>}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[req.status] ?? ''}`}>
                    {req.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
