import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Award } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PerformanceReviewCard } from '../components/PerformanceReviewCard';
import { SelfReviewForm } from '../components/SelfReviewForm';
import { REVIEW_PERIODS } from '../lib/reviewPeriods';
import {
  useAllPerformanceReviews,
  useCreateSelfReview,
  useSubmitSelfReview,
  useManagerReview,
  useHrApproveReview,
  useRejectReview,
} from '../hooks/queries';
import type { PerformanceReview } from '../types';

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
  const [reviewPeriodFilter, setReviewPeriodFilter] = useState<string>('');
  const [showNewForm, setShowNewForm] = useState(false);

  const activeFilters = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(reviewPeriodFilter ? { reviewPeriod: reviewPeriodFilter } : {}),
  };
  const { data: reviews = [], isLoading } = useAllPerformanceReviews(
    Object.keys(activeFilters).length ? activeFilters : undefined
  );

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

      {/* Period filter */}
      <div className="flex gap-2 flex-wrap">
        {(['', ...REVIEW_PERIODS] as string[]).map((p) => (
          <button
            key={p}
            onClick={() => setReviewPeriodFilter(p)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              reviewPeriodFilter === p
                ? 'bg-primary text-white border-primary'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark hover:border-primary hover:text-primary'
            }`}
          >
            {p || t('periodFilter.all', 'All Periods')}
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
            <PerformanceReviewCard
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
