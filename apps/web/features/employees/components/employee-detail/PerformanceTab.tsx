import React from 'react';
import { Plus, Edit2, Trash2, Star } from 'lucide-react';
import { PerformanceTabProps } from './EmployeeDetailTypes';

export const PerformanceTab: React.FC<PerformanceTabProps> = ({
    isAdmin,
    reviewsList,
    onAddReview,
    onEditReview,
    onDeleteReview,
}) => {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Performance Reviews</h3>
                {isAdmin && (
                    <button
                        onClick={onAddReview}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        <Plus size={16} />
                        New Review
                    </button>
                )}
            </div>
            {reviewsList.length > 0 ? (
                <div className="space-y-4">
                    {reviewsList.map(review => (
                        <div key={review.id} className="bg-background-light dark:bg-background-dark/50 rounded-lg border border-border-light dark:border-border-dark p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-text-light dark:text-text-dark">Review by {review.reviewer}</span>
                                        <span className="text-xs text-text-muted-light dark:text-text-muted-dark">• {review.date}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star
                                                key={star}
                                                size={16}
                                                className={`${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                                            />
                                        ))}
                                        <span className="ml-2 text-sm font-medium text-text-light dark:text-text-dark">{review.rating}/5</span>
                                    </div>
                                </div>
                                {isAdmin && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onEditReview(review)}
                                            className="p-1.5 text-text-muted-light hover:text-primary transition-colors"
                                            title="Edit Review"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => onDeleteReview(review.id)}
                                            className="p-1.5 text-text-muted-light hover:text-accent-red transition-colors"
                                            title="Delete Review"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="bg-card-light dark:bg-card-dark p-4 rounded-lg border border-border-light dark:border-border-dark">
                                <p className="text-sm text-text-muted-light dark:text-text-muted-dark italic">"{review.notes}"</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-text-muted-light dark:text-text-muted-dark border-2 border-dashed border-border-light dark:border-border-dark rounded-xl">
                    <Star size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No performance reviews recorded.</p>
                    <p className="text-xs mt-1">Start by adding a new review.</p>
                </div>
            )}
        </div>
    );
};
