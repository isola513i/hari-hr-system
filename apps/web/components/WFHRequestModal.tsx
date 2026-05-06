import { useState } from 'react';
import { Home, FileText, Clock } from 'lucide-react';
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
      onSuccess('WFH request submitted successfully');
    } catch (error) {
      // error shown inline via mutation state
    }
  };

  const errorMsg = createMutation.error instanceof Error
    ? createMutation.error.message
    : createMutation.isError ? 'Failed to submit request' : null;

  return (
    <Modal isOpen onClose={onClose} title="Work From Home Request" maxWidth="sm">
      <div className="p-6 space-y-4">
        {/* Tabs */}
        <div className="flex border-b border-border-light dark:border-border-dark">
          {(['new', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark'
              }`}
            >
              {t === 'new' ? 'New Request' : 'My Requests'}
            </button>
          ))}
        </div>

        {tab === 'new' ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <DatePicker
                label="Date"
                value={date}
                minDate={today}
                onChange={setDate}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text-light dark:text-text-dark flex items-center gap-1.5">
                <FileText size={14} /> Reason <span className="text-text-muted-light dark:text-text-muted-dark font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Home renovation, family matter..."
                className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            {errorMsg && (
              <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-text-light dark:text-text-dark border border-border-light dark:border-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!date || createMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Home size={15} />
                {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {myRequests.length === 0 ? (
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark text-center py-6">No WFH requests yet</p>
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
