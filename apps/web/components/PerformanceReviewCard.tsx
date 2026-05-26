import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Send, ThumbsUp, CheckCircle, XCircle } from 'lucide-react';
import { Avatar } from './Avatar';
import { PerformanceStatusBadge, StarRating } from './PerformanceStatusBadge';
import type { PerformanceReview } from '../types';

interface PerformanceReviewCardProps {
  review: PerformanceReview;
  role: string;
  onManagerReview: (id: string, rating: number, comment: string) => void;
  onHrApprove: (id: string, comment: string) => void;
  onReject: (id: string, reason: string) => void;
  onSubmit: (id: string) => void;
}

export function PerformanceReviewCard({
  review,
  role,
  onManagerReview,
  onHrApprove,
  onReject,
  onSubmit,
}: PerformanceReviewCardProps) {
  const { t } = useTranslation(['performance-reviews']);
  const [expanded, setExpanded] = useState(false);
  const [mgrRating, setMgrRating] = useState(review.rating ?? 0);
  const [mgrComment, setMgrComment] = useState('');
  const [hrComment, setHrComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [action, setAction] = useState<'manager' | 'hr' | 'reject' | null>(null);

  const canManagerReview = role === 'MANAGER' || role === 'HR_ADMIN';
  const canHrApprove = role === 'HR_ADMIN';
  const isEmployee = role === 'EMPLOYEE';

  const employeeName = review.employeeName ?? review.reviewer ?? '';

  return (
    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden shadow-sm">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-background-light dark:hover:bg-background-dark/40 transition-colors text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={employeeName} size="md" />
          <div className="min-w-0">
            <p className="font-semibold text-text-primary-light dark:text-text-primary-dark truncate">
              {employeeName}
            </p>
            <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
              {review.reviewPeriod ?? new Date(review.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              {review.reviewer && ` · ${t('reviewer', { name: review.reviewer })}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {review.rating !== null && <StarRating value={review.rating} readonly />}
          <PerformanceStatusBadge status={review.status} />
          {expanded
            ? <ChevronUp size={16} className="text-text-muted-light dark:text-text-muted-dark" />
            : <ChevronDown size={16} className="text-text-muted-light dark:text-text-muted-dark" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-border-light dark:border-border-dark space-y-4 pt-4">
          {review.selfReview && (
            <div>
              <p className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide mb-1.5">
                {t('sections.selfReview')}
              </p>
              <p className="text-sm text-text-primary-light dark:text-text-primary-dark bg-background-light dark:bg-background-dark rounded-lg p-3 leading-relaxed">
                {review.selfReview}
              </p>
            </div>
          )}
          {review.notes && (
            <div>
              <p className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide mb-1.5">
                {t('sections.notes')}
              </p>
              <p className="text-sm text-text-primary-light dark:text-text-primary-dark leading-relaxed">
                {review.notes}
              </p>
            </div>
          )}
          {review.managerComment && (
            <div>
              <p className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide mb-1.5">
                {t('sections.managerFeedback')}
              </p>
              <p className="text-sm text-text-primary-light dark:text-text-primary-dark bg-primary/5 dark:bg-primary/10 rounded-lg p-3 leading-relaxed">
                {review.managerComment}
              </p>
            </div>
          )}
          {review.hrComment && (
            <div>
              <p className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide mb-1.5">
                {t('sections.hrComment')}
              </p>
              <p className="text-sm text-text-primary-light dark:text-text-primary-dark bg-accent-green/5 dark:bg-accent-green/10 rounded-lg p-3 leading-relaxed">
                {review.hrComment}
              </p>
            </div>
          )}

          {/* Employee: submit draft */}
          {isEmployee && review.status === 'draft' && (
            <button
              onClick={() => onSubmit(review.id)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              <Send size={14} /> {t('actions.submitForManager')}
            </button>
          )}

          {/* Manager: review submitted */}
          {canManagerReview && review.status === 'submitted' && (
            <div className="space-y-3">
              {action !== 'manager' ? (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setAction('manager')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
                  >
                    <ThumbsUp size={14} /> {t('actions.writeReview')}
                  </button>
                  <button
                    onClick={() => setAction('reject')}
                    className="flex items-center gap-2 px-4 py-2 bg-accent-red/10 text-accent-red rounded-lg text-sm font-medium hover:bg-accent-red/20 transition-colors"
                  >
                    <XCircle size={14} /> {t('actions.requestRevision')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 bg-primary/5 dark:bg-primary/10 rounded-lg p-4">
                  <div>
                    <p className="text-sm font-medium mb-2 text-text-primary-light dark:text-text-primary-dark">
                      {t('form.rating')}
                    </p>
                    <StarRating value={mgrRating} onChange={setMgrRating} />
                  </div>
                  <textarea
                    value={mgrComment}
                    onChange={(e) => setMgrComment(e.target.value)}
                    placeholder={t('form.feedbackPlaceholder')}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-sm text-text-primary-light dark:text-text-primary-dark resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onManagerReview(review.id, mgrRating, mgrComment); setAction(null); }}
                      disabled={!mgrRating || !mgrComment.trim()}
                      className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
                    >
                      {t('actions.submitReview')}
                    </button>
                    <button
                      onClick={() => setAction(null)}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                    >
                      {t('actions.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reject form (shared between manager and HR) */}
          {action === 'reject' && (
            <div className="space-y-3 bg-accent-red/5 dark:bg-accent-red/10 rounded-lg p-4">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('form.rejectReasonPlaceholder')}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-red"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { onReject(review.id, rejectReason); setAction(null); }}
                  className="px-4 py-2 bg-accent-red text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  {t('actions.sendBack')}
                </button>
                <button
                  onClick={() => setAction(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                >
                  {t('actions.cancel')}
                </button>
              </div>
            </div>
          )}

          {/* HR: finalize */}
          {canHrApprove && review.status === 'manager_reviewed' && (
            <div className="space-y-3">
              {action !== 'hr' ? (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setAction('hr')}
                    className="flex items-center gap-2 px-4 py-2 bg-accent-green text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <CheckCircle size={14} /> {t('actions.finalizeReview')}
                  </button>
                  <button
                    onClick={() => setAction('reject')}
                    className="flex items-center gap-2 px-4 py-2 bg-accent-red/10 text-accent-red rounded-lg text-sm font-medium hover:bg-accent-red/20 transition-colors"
                  >
                    <XCircle size={14} /> {t('actions.sendBack')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 bg-accent-green/5 dark:bg-accent-green/10 rounded-lg p-4">
                  <textarea
                    value={hrComment}
                    onChange={(e) => setHrComment(e.target.value)}
                    placeholder={t('form.hrCommentPlaceholder')}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-green"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onHrApprove(review.id, hrComment); setAction(null); }}
                      className="px-4 py-2 bg-accent-green text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      {t('actions.finalize')}
                    </button>
                    <button
                      onClick={() => setAction(null)}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                    >
                      {t('actions.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
