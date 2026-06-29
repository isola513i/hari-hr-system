import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus, Check, Clock, X } from 'lucide-react';
import { Avatar } from './Avatar';
import { StarRating } from './PerformanceStatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useAllEmployees } from '../hooks/queries';
import {
  usePeerFeedback,
  useRequestPeerReviews,
  useSubmitPeerFeedback,
} from '../hooks/queries';
import type { AggregateScore } from '../types';

interface PeerReviewPanelProps {
  reviewId: string;
  subjectEmployeeId: string;
  role: string;
}

// ── Aggregate score breakdown (Manager / Peers / Overall) ─────────────────────

function ScoreBar({ label, value, max = 5 }: { label: string; value: number | null; max?: number }) {
  const pct = value !== null ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-text-primary-light dark:text-text-primary-dark">
          {value !== null ? value.toFixed(1) : '—'}
        </span>
      </div>
      <div className="h-2 rounded-full bg-background-light dark:bg-background-dark overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AggregateBreakdown({ aggregate }: { aggregate: AggregateScore }) {
  const { t } = useTranslation(['performance-reviews']);
  const hasData = aggregate.managerRating !== null || aggregate.peerCount > 0;
  if (!hasData) return null;

  return (
    <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide">
          {t('peer.aggregateTitle', '360° Score Breakdown')}
        </p>
        {aggregate.overall !== null && (
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-bold text-primary tabular-nums leading-none">
              {aggregate.overall.toFixed(1)}
            </span>
            <span className="text-xs text-text-muted-light dark:text-text-muted-dark">/ 5</span>
          </div>
        )}
      </div>
      <div className="space-y-2.5">
        <ScoreBar label={t('peer.managerScore', 'Manager')} value={aggregate.managerRating} />
        <ScoreBar
          label={t('peer.peerScore', 'Peers ({{count}})', { count: aggregate.peerCount })}
          value={aggregate.peerAverage}
        />
      </div>
      <p className="text-[11px] text-text-muted-light dark:text-text-muted-dark">
        {t('peer.weighting', 'Overall = Manager 60% + Peers 40%')}
      </p>
    </div>
  );
}

// ── Peer-select modal ─────────────────────────────────────────────────────────

function PeerSelectModal({
  subjectEmployeeId,
  alreadyRequested,
  onClose,
  onConfirm,
  loading,
}: {
  subjectEmployeeId: string;
  alreadyRequested: Set<string>;
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
  loading: boolean;
}) {
  const { t } = useTranslation(['performance-reviews', 'common']);
  const { data: employees = [] } = useAllEmployees();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const candidates = employees.filter(
    (e) => e.id !== subjectEmployeeId && !alreadyRequested.has(e.id)
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light dark:border-border-dark">
          <h3 className="font-semibold text-text-primary-light dark:text-text-primary-dark">
            {t('peer.selectTitle', 'Request Peer Feedback')}
          </h3>
          <button onClick={onClose} className="text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
          {candidates.length === 0 ? (
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark py-6 text-center">
              {t('peer.noCandidates', 'No more colleagues available to request.')}
            </p>
          ) : (
            candidates.map((e) => (
              <label
                key={e.id}
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(e.id)}
                  onChange={() => toggle(e.id)}
                  className="w-4 h-4 rounded accent-primary"
                />
                <Avatar name={e.name} src={e.avatar} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark truncate">{e.name}</p>
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark truncate">{e.role} · {e.department}</p>
                </div>
              </label>
            ))
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-light dark:border-border-dark">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors"
          >
            {t('actions.cancel', 'Cancel')}
          </button>
          <button
            onClick={() => onConfirm([...selected])}
            disabled={selected.size === 0 || loading}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {loading ? t('actions.saving', 'Saving...') : t('peer.requestN', 'Request ({{count}})', { count: selected.size })}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function PeerReviewPanel({ reviewId, subjectEmployeeId, role }: PeerReviewPanelProps) {
  const { t } = useTranslation(['performance-reviews']);
  const { user } = useAuth();
  const { showToast } = useToast();
  const { data, isLoading } = usePeerFeedback(reviewId);
  const requestPeers = useRequestPeerReviews();
  const submitFeedback = useSubmitPeerFeedback();

  const [showModal, setShowModal] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  const canManage = role === 'MANAGER' || role === 'HR_ADMIN';
  const feedback = data?.feedback ?? [];
  const aggregate = data?.aggregate;

  // Is the current user a pending peer reviewer for this review?
  const myPendingSlot = feedback.find(
    (f) => f.reviewerId === user?.employeeId && f.status === 'pending'
  );

  const alreadyRequested = new Set(feedback.map((f) => f.reviewerId).filter(Boolean) as string[]);

  const handleRequest = async (ids: string[]) => {
    try {
      await requestPeers.mutateAsync({ reviewId, peerEmployeeIds: ids });
      showToast(t('peer.requestSent', 'Peer review requests sent'), 'success');
      setShowModal(false);
    } catch {
      showToast(t('peer.requestFailed', 'Failed to send peer requests'), 'error');
    }
  };

  const handleSubmit = async () => {
    try {
      await submitFeedback.mutateAsync({ reviewId, rating: myRating, feedback: myComment, isAnonymous: anonymous });
      showToast(t('peer.submitted', 'Feedback submitted'), 'success');
      setMyRating(0);
      setMyComment('');
      setAnonymous(false);
    } catch {
      showToast(t('peer.submitFailed', 'Failed to submit feedback'), 'error');
    }
  };

  if (isLoading) {
    return <div className="h-16 rounded-lg bg-background-light dark:bg-background-dark animate-pulse" />;
  }

  return (
    <div className="space-y-3 border-t border-border-light dark:border-border-dark pt-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide flex items-center gap-1.5">
          <Users size={13} /> {t('peer.title', '360° Peer Review')}
        </p>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            <UserPlus size={13} /> {t('peer.request', 'Request Peer Review')}
          </button>
        )}
      </div>

      {aggregate && <AggregateBreakdown aggregate={aggregate} />}

      {/* Peer reviewers list */}
      {feedback.length > 0 && (
        <div className="space-y-2">
          {feedback.map((f) => (
            <div
              key={f.id}
              className="flex items-start gap-3 bg-background-light dark:bg-background-dark rounded-lg p-3"
            >
              <Avatar name={f.reviewerName} src={f.reviewerAvatar ?? undefined} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark truncate">
                    {f.reviewerName}
                  </p>
                  {f.status === 'submitted' ? (
                    <span className="flex items-center gap-1 text-[11px] text-accent-green shrink-0">
                      <Check size={12} /> {t('peer.statusSubmitted', 'Submitted')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] text-accent-orange shrink-0">
                      <Clock size={12} /> {t('peer.statusPending', 'Pending')}
                    </span>
                  )}
                </div>
                {f.status === 'submitted' && (
                  <div className="mt-1 space-y-1">
                    {f.rating !== null && <StarRating value={f.rating} readonly />}
                    {f.feedback && (
                      <p className="text-sm text-text-primary-light dark:text-text-primary-dark leading-relaxed">{f.feedback}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {feedback.length === 0 && !canManage && (
        <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
          {t('peer.empty', 'No peer feedback requested yet.')}
        </p>
      )}

      {/* Current user is a pending peer → submit form */}
      {myPendingSlot && (
        <div className="space-y-3 bg-accent-teal/5 dark:bg-accent-teal/10 rounded-lg p-4">
          <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
            {t('peer.yourTurn', 'You were asked to give peer feedback')}
          </p>
          <StarRating value={myRating} onChange={setMyRating} />
          <textarea
            value={myComment}
            onChange={(e) => setMyComment(e.target.value)}
            placeholder={t('peer.feedbackPlaceholder', 'Share your feedback...')}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-sm text-text-primary-light dark:text-text-primary-dark resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <label className="flex items-center gap-2 text-xs text-text-muted-light dark:text-text-muted-dark cursor-pointer">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="w-4 h-4 rounded accent-primary"
            />
            {t('peer.anonymous', 'Submit anonymously')}
          </label>
          <button
            onClick={handleSubmit}
            disabled={!myRating || submitFeedback.isPending}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {submitFeedback.isPending ? t('actions.saving', 'Saving...') : t('peer.submit', 'Submit Feedback')}
          </button>
        </div>
      )}

      {showModal && (
        <PeerSelectModal
          subjectEmployeeId={subjectEmployeeId}
          alreadyRequested={alreadyRequested}
          onClose={() => setShowModal(false)}
          onConfirm={handleRequest}
          loading={requestPeers.isPending}
        />
      )}
    </div>
  );
}

export default PeerReviewPanel;
