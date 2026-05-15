import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Plus, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp, Send, ThumbsUp, Award } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Avatar } from '../components/Avatar';
import {
  useAllPerformanceReviews,
  useCreateSelfReview,
  useSubmitSelfReview,
  useManagerReview,
  useHrApproveReview,
  useRejectReview,
} from '../hooks/queries';
import type { PerformanceReview } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  draft:            'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400',
  submitted:        'bg-accent-orange/10 text-accent-orange',
  manager_reviewed: 'bg-primary/10 text-primary',
  completed:        'bg-accent-green/10 text-accent-green',
  rejected:         'bg-accent-red/10 text-accent-red',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  draft:            <Clock size={12} />,
  submitted:        <Clock size={12} />,
  manager_reviewed: <ThumbsUp size={12} />,
  completed:        <CheckCircle size={12} />,
  rejected:         <XCircle size={12} />,
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation(['performance-reviews']);
  const color = STATUS_COLOR[status] ?? STATUS_COLOR['draft'];
  const icon = STATUS_ICON[status] ?? STATUS_ICON['draft'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {icon} {t(`status.${status}`, status)}
    </span>
  );
}

function StarRating({ value, onChange, readonly }: { value: number | null; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <Star
            size={20}
            className={
              s <= (hover || value || 0)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            }
          />
        </button>
      ))}
    </div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────

function ReviewCard({
  review,
  role,
  onManagerReview,
  onHrApprove,
  onReject,
  onSubmit,
}: {
  review: PerformanceReview;
  role: string;
  onManagerReview: (id: string, rating: number, comment: string) => void;
  onHrApprove: (id: string, comment: string) => void;
  onReject: (id: string, reason: string) => void;
  onSubmit: (id: string) => void;
}) {
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
          <StatusBadge status={review.status} />
          {expanded ? <ChevronUp size={16} className="text-text-muted-light dark:text-text-muted-dark" /> : <ChevronDown size={16} className="text-text-muted-light dark:text-text-muted-dark" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-border-light dark:border-border-dark space-y-4 pt-4">
          {review.selfReview && (
            <div>
              <p className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide mb-1.5">{t('sections.selfReview')}</p>
              <p className="text-sm text-text-primary-light dark:text-text-primary-dark bg-background-light dark:bg-background-dark rounded-lg p-3 leading-relaxed">{review.selfReview}</p>
            </div>
          )}
          {review.notes && (
            <div>
              <p className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide mb-1.5">{t('sections.notes')}</p>
              <p className="text-sm text-text-primary-light dark:text-text-primary-dark leading-relaxed">{review.notes}</p>
            </div>
          )}
          {review.managerComment && (
            <div>
              <p className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide mb-1.5">{t('sections.managerFeedback')}</p>
              <p className="text-sm text-text-primary-light dark:text-text-primary-dark bg-primary/5 dark:bg-primary/10 rounded-lg p-3 leading-relaxed">{review.managerComment}</p>
            </div>
          )}
          {review.hrComment && (
            <div>
              <p className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide mb-1.5">{t('sections.hrComment')}</p>
              <p className="text-sm text-text-primary-light dark:text-text-primary-dark bg-accent-green/5 dark:bg-accent-green/10 rounded-lg p-3 leading-relaxed">{review.hrComment}</p>
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
                  <button onClick={() => setAction('manager')} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
                    <ThumbsUp size={14} /> {t('actions.writeReview')}
                  </button>
                  <button onClick={() => setAction('reject')} className="flex items-center gap-2 px-4 py-2 bg-accent-red/10 text-accent-red rounded-lg text-sm font-medium hover:bg-accent-red/20 transition-colors">
                    <XCircle size={14} /> {t('actions.requestRevision')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 bg-primary/5 dark:bg-primary/10 rounded-lg p-4">
                  <div>
                    <p className="text-sm font-medium mb-2 text-text-primary-light dark:text-text-primary-dark">{t('form.rating')}</p>
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
                    <button onClick={() => setAction(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors">
                      {t('actions.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reject form */}
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
                <button onClick={() => setAction(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors">
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
                  <button onClick={() => setAction('hr')} className="flex items-center gap-2 px-4 py-2 bg-accent-green text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                    <CheckCircle size={14} /> {t('actions.finalizeReview')}
                  </button>
                  <button onClick={() => setAction('reject')} className="flex items-center gap-2 px-4 py-2 bg-accent-red/10 text-accent-red rounded-lg text-sm font-medium hover:bg-accent-red/20 transition-colors">
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
                    <button onClick={() => setAction(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors">
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

// ─── Self Review Form ─────────────────────────────────────────────────────────

function SelfReviewForm({ onSubmit, loading }: { onSubmit: (data: { selfReview: string; reviewPeriod?: string }) => void; loading: boolean }) {
  const { t } = useTranslation(['performance-reviews']);
  const [selfReview, setSelfReview] = useState('');
  const [reviewPeriod, setReviewPeriod] = useState('');

  const currentYear = new Date().getFullYear();
  const periods = [
    `${currentYear}-H1`, `${currentYear}-H2`,
    `${currentYear}-Q1`, `${currentYear}-Q2`, `${currentYear}-Q3`, `${currentYear}-Q4`,
  ];

  return (
    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-5 space-y-4 shadow-sm">
      <h3 className="font-semibold text-text-primary-light dark:text-text-primary-dark">{t('actions.newSelfReview')}</h3>
      <div>
        <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1">{t('form.reviewPeriod')}</label>
        <select
          value={reviewPeriod}
          onChange={(e) => setReviewPeriod(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-sm text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">{t('form.selectPeriod')}</option>
          {periods.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1">{t('form.selfAssessment')}</label>
        <textarea
          value={selfReview}
          onChange={(e) => setSelfReview(e.target.value)}
          placeholder={t('form.selfAssessmentPlaceholder')}
          rows={5}
          className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-sm text-text-primary-light dark:text-text-primary-dark resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <button
        onClick={() => onSubmit({ selfReview, reviewPeriod: reviewPeriod || undefined })}
        disabled={!selfReview.trim() || loading}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
      >
        <Plus size={14} /> {loading ? t('actions.saving') : t('actions.saveDraft')}
      </button>
    </div>
  );
}

// ─── Pipeline Summary Strip ───────────────────────────────────────────────────

function PipelineSummary({ reviews }: { reviews: PerformanceReview[] }) {
  const { t } = useTranslation(['performance-reviews']);

  const counts = {
    submitted: reviews.filter(r => r.status === 'submitted').length,
    manager_reviewed: reviews.filter(r => r.status === 'manager_reviewed').length,
    completed: reviews.filter(r => r.status === 'completed').length,
  };

  if (!reviews.length) return null;

  return (
    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm divide-x divide-border-light dark:divide-border-dark flex overflow-hidden">
      <div className="flex-1 px-5 py-3 text-center">
        <p className="text-2xl font-bold text-accent-orange tabular-nums">{counts.submitted}</p>
        <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{t('status.submitted', 'รอดำเนินการ')}</p>
      </div>
      <div className="flex-1 px-5 py-3 text-center">
        <p className="text-2xl font-bold text-primary tabular-nums">{counts.manager_reviewed}</p>
        <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{t('status.manager_reviewed', 'ผู้จัดการรีวิวแล้ว')}</p>
      </div>
      <div className="flex-1 px-5 py-3 text-center">
        <p className="text-2xl font-bold text-accent-green tabular-nums">{counts.completed}</p>
        <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{t('status.completed', 'เสร็จสิ้น')}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function PerformanceReviews() {
  const { t } = useTranslation(['performance-reviews']);
  const { user } = useAuth();
  const role = user?.role ?? 'EMPLOYEE';

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showNewForm, setShowNewForm] = useState(false);

  const { data: reviews = [], isLoading } = useAllPerformanceReviews(statusFilter ? { status: statusFilter } : undefined);

  const createSelfReview = useCreateSelfReview();
  const submitSelfReview = useSubmitSelfReview();
  const managerReview = useManagerReview();
  const hrApprove = useHrApproveReview();
  const rejectReview = useRejectReview();

  const handleCreateSelf = async (data: { selfReview: string; reviewPeriod?: string }) => {
    await createSelfReview.mutateAsync(data);
    setShowNewForm(false);
  };

  const statuses = ['', 'draft', 'submitted', 'manager_reviewed', 'completed', 'rejected'];

  const pendingCount = reviews.filter(r => ['submitted', 'manager_reviewed'].includes(r.status)).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">{t('page.title')}</h1>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-0.5">
            {pendingCount > 0
              ? t('page.reviewsNeedAttention', { count: pendingCount })
              : t('page.subtitle')}
          </p>
        </div>
        {role === 'EMPLOYEE' && (
          <button
            onClick={() => setShowNewForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors shrink-0"
          >
            <Plus size={16} /> {t('actions.newSelfReview')}
          </button>
        )}
      </div>

      {/* Pipeline summary (non-employee roles see counts) */}
      {role !== 'EMPLOYEE' && !isLoading && <PipelineSummary reviews={reviews} />}

      {/* New self-review form */}
      {showNewForm && role === 'EMPLOYEE' && (
        <SelfReviewForm onSubmit={handleCreateSelf} loading={createSelfReview.isPending} />
      )}

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              statusFilter === s
                ? 'bg-primary text-white border-primary'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark hover:border-primary hover:text-primary'
            }`}
          >
            {t(`statusFilter.${s || 'all'}`, s || 'All')}
          </button>
        ))}
      </div>

      {/* Reviews list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-14 text-text-muted-light dark:text-text-muted-dark">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Award size={24} className="text-primary" />
          </div>
          <p className="font-medium text-text-primary-light dark:text-text-primary-dark">{t('empty.noReviews')}</p>
          {role === 'EMPLOYEE' && <p className="text-sm mt-1">{t('empty.startHint')}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              role={role}
              onManagerReview={(id, rating, comment) => managerReview.mutate({ id, rating, managerComment: comment })}
              onHrApprove={(id, comment) => hrApprove.mutate({ id, hrComment: comment })}
              onReject={(id, reason) => rejectReview.mutate({ id, reason })}
              onSubmit={(id) => submitSelfReview.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default PerformanceReviews;
