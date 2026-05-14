import React, { useState } from 'react';
import { Star, Plus, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp, Send, ThumbsUp, Award } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:            { label: 'Draft',            color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',    icon: <Clock size={12} /> },
  submitted:        { label: 'Pending Review',   color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: <Clock size={12} /> },
  manager_reviewed: { label: 'Manager Reviewed', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',  icon: <ThumbsUp size={12} /> },
  completed:        { label: 'Completed',        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: <CheckCircle size={12} /> },
  rejected:         { label: 'Needs Revision',   color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',     icon: <XCircle size={12} /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['draft'];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.icon} {cfg.label}
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
  const [expanded, setExpanded] = useState(false);
  const [mgrRating, setMgrRating] = useState(review.rating ?? 0);
  const [mgrComment, setMgrComment] = useState('');
  const [hrComment, setHrComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [action, setAction] = useState<'manager' | 'hr' | 'reject' | null>(null);

  const canManagerReview = role === 'MANAGER' || role === 'HR_ADMIN';
  const canHrApprove = role === 'HR_ADMIN';
  const isEmployee = role === 'EMPLOYEE';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Award size={18} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-text-primary-light dark:text-text-primary-dark truncate">
              {review.employeeName ?? review.reviewer}
            </p>
            <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
              {review.reviewPeriod ?? new Date(review.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              {review.reviewer && ` • By ${review.reviewer}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {review.rating !== null && <StarRating value={review.rating} readonly />}
          <StatusBadge status={review.status} />
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700 space-y-4 pt-4">
          {review.selfReview && (
            <div>
              <p className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide mb-1">Self Review</p>
              <p className="text-sm text-text-primary-light dark:text-text-primary-dark bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">{review.selfReview}</p>
            </div>
          )}
          {review.notes && (
            <div>
              <p className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-text-primary-light dark:text-text-primary-dark">{review.notes}</p>
            </div>
          )}
          {review.managerComment && (
            <div>
              <p className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide mb-1">Manager Feedback</p>
              <p className="text-sm text-text-primary-light dark:text-text-primary-dark bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">{review.managerComment}</p>
            </div>
          )}
          {review.hrComment && (
            <div>
              <p className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide mb-1">HR Comment</p>
              <p className="text-sm text-text-primary-light dark:text-text-primary-dark bg-green-50 dark:bg-green-900/20 rounded-lg p-3">{review.hrComment}</p>
            </div>
          )}

          {/* Employee: submit draft */}
          {isEmployee && review.status === 'draft' && (
            <button
              onClick={() => onSubmit(review.id)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              <Send size={14} /> Submit for Manager Review
            </button>
          )}

          {/* Manager: review submitted */}
          {canManagerReview && review.status === 'submitted' && (
            <div className="space-y-3">
              {action !== 'manager' ? (
                <div className="flex gap-2">
                  <button onClick={() => setAction('manager')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    <ThumbsUp size={14} /> Write Review
                  </button>
                  <button onClick={() => setAction('reject')} className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                    <XCircle size={14} /> Request Revision
                  </button>
                </div>
              ) : (
                <div className="space-y-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div>
                    <p className="text-sm font-medium mb-2 text-text-primary-light dark:text-text-primary-dark">Rating</p>
                    <StarRating value={mgrRating} onChange={setMgrRating} />
                  </div>
                  <textarea
                    value={mgrComment}
                    onChange={(e) => setMgrComment(e.target.value)}
                    placeholder="Add your feedback..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-text-primary-light dark:text-text-primary-dark resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onManagerReview(review.id, mgrRating, mgrComment); setAction(null); }}
                      disabled={!mgrRating || !mgrComment.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      Submit Review
                    </button>
                    <button onClick={() => setAction(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reject form */}
          {action === 'reject' && (
            <div className="space-y-3 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for requesting revision..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { onReject(review.id, rejectReason); setAction(null); }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Send Back
                </button>
                <button onClick={() => setAction(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* HR: finalize */}
          {canHrApprove && review.status === 'manager_reviewed' && (
            <div className="space-y-3">
              {action !== 'hr' ? (
                <div className="flex gap-2">
                  <button onClick={() => setAction('hr')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                    <CheckCircle size={14} /> Finalize Review
                  </button>
                  <button onClick={() => setAction('reject')} className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                    <XCircle size={14} /> Send Back
                  </button>
                </div>
              ) : (
                <div className="space-y-3 bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <textarea
                    value={hrComment}
                    onChange={(e) => setHrComment(e.target.value)}
                    placeholder="Optional HR comment..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onHrApprove(review.id, hrComment); setAction(null); }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      Finalize
                    </button>
                    <button onClick={() => setAction(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      Cancel
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
  const [selfReview, setSelfReview] = useState('');
  const [reviewPeriod, setReviewPeriod] = useState('');

  const currentYear = new Date().getFullYear();
  const periods = [
    `${currentYear}-H1`, `${currentYear}-H2`,
    `${currentYear}-Q1`, `${currentYear}-Q2`, `${currentYear}-Q3`, `${currentYear}-Q4`,
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <h3 className="font-semibold text-text-primary-light dark:text-text-primary-dark">New Self-Review</h3>
      <div>
        <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1">Review Period</label>
        <select
          value={reviewPeriod}
          onChange={(e) => setReviewPeriod(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select period...</option>
          {periods.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1">Self Assessment</label>
        <textarea
          value={selfReview}
          onChange={(e) => setSelfReview(e.target.value)}
          placeholder="Describe your accomplishments, challenges, and goals for next period..."
          rows={5}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <button
        onClick={() => onSubmit({ selfReview, reviewPeriod: reviewPeriod || undefined })}
        disabled={!selfReview.trim() || loading}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        <Plus size={14} /> {loading ? 'Saving...' : 'Save Draft'}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function PerformanceReviews() {
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
  const statusLabels: Record<string, string> = {
    '': 'All', draft: 'Draft', submitted: 'Pending', manager_reviewed: 'Manager Reviewed', completed: 'Completed', rejected: 'Needs Revision',
  };

  const pendingCount = reviews.filter(r => ['submitted', 'manager_reviewed'].includes(r.status)).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">Performance Reviews</h1>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-0.5">
            {pendingCount > 0 ? `${pendingCount} review${pendingCount > 1 ? 's' : ''} need${pendingCount === 1 ? 's' : ''} attention` : 'Manage performance evaluations'}
          </p>
        </div>
        {role === 'EMPLOYEE' && (
          <button
            onClick={() => setShowNewForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <Plus size={16} /> New Self-Review
          </button>
        )}
      </div>

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
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-text-muted-light dark:text-text-muted-dark hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>

      {/* Reviews list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 text-text-muted-light dark:text-text-muted-dark">
          <Award size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No reviews found</p>
          {role === 'EMPLOYEE' && <p className="text-sm mt-1">Start by creating a self-review above</p>}
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
