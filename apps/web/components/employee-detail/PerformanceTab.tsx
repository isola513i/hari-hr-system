import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PerformanceReviewCard } from '../PerformanceReviewCard';
import { SelfReviewForm } from '../SelfReviewForm';
import {
    usePerformanceReviews,
    useCreateSelfReview,
    useSubmitSelfReview,
    useManagerReview,
    useHrApproveReview,
    useRejectReview,
} from '../../hooks/queries';
import type { PerformanceTabProps } from './EmployeeDetailTypes';

export const PerformanceTab: React.FC<PerformanceTabProps> = ({ employeeId, isAdmin, onAddReview }) => {
    const { t } = useTranslation(['performance-reviews', 'employees']);
    const { user } = useAuth();
    const role = user?.role ?? 'EMPLOYEE';

    const [showSelfReviewForm, setShowSelfReviewForm] = useState(false);

    const { data: reviews = [], isLoading } = usePerformanceReviews(employeeId);
    const createSelfReview = useCreateSelfReview();
    const submitSelfReview = useSubmitSelfReview();
    const managerReview = useManagerReview();
    const hrApprove = useHrApproveReview();
    const rejectReview = useRejectReview();

    // Employee only sees the self-review button on their own profile
    const isOwnProfile = user?.employeeId === employeeId;

    const handleCreateSelf = async (data: { selfReview: string; reviewPeriod?: string }) => {
        await createSelfReview.mutateAsync(data);
        setShowSelfReviewForm(false);
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-text-light dark:text-text-dark">
                    {t('employees:performance.title')}
                </h3>
                <div className="flex gap-2">
                    {isOwnProfile && role === 'EMPLOYEE' && (
                        <button
                            onClick={() => setShowSelfReviewForm((v) => !v)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            <Plus size={16} /> {t('performance-reviews:actions.newSelfReview')}
                        </button>
                    )}
                    {isAdmin && onAddReview && (
                        <button
                            onClick={onAddReview}
                            className="flex items-center gap-2 px-3 py-1.5 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark rounded-md text-sm font-medium hover:border-primary hover:text-primary transition-colors"
                        >
                            <Plus size={16} /> {t('employees:performance.newReview')}
                        </button>
                    )}
                </div>
            </div>

            {showSelfReviewForm && (
                <SelfReviewForm onSubmit={handleCreateSelf} loading={createSelfReview.isPending} />
            )}

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            ) : reviews.length === 0 ? (
                <div className="text-center py-12 text-text-muted-light dark:text-text-muted-dark border-2 border-dashed border-border-light dark:border-border-dark rounded-xl">
                    <Award size={48} className="mx-auto mb-4 opacity-20" />
                    <p>{t('employees:performance.noReviewsYet')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {reviews.map((review) => (
                        <PerformanceReviewCard
                            key={review.id}
                            review={review}
                            role={role}
                            onManagerReview={(id, rating, comment) =>
                                managerReview.mutate({ id, rating, managerComment: comment })
                            }
                            onHrApprove={(id, comment) => hrApprove.mutate({ id, hrComment: comment })}
                            onReject={(id, reason) => rejectReview.mutate({ id, reason })}
                            onSubmit={(id) => submitSelfReview.mutate(id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
