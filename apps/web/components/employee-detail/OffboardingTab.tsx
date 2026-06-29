import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    CheckSquare,
    Square,
    Calendar,
    User,
    Clock,
    CheckCircle2,
    AlertTriangle,
    FileText,
    Star,
    ThumbsUp,
    ThumbsDown,
    ChevronDown,
    ChevronRight,
    Loader2,
} from 'lucide-react';
import { OffboardingTabProps } from './EmployeeDetailTypes';
import type { OffboardingTask, ExitInterview } from '../../types';
import { formatDate as _formatDate } from '../../lib/date';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Null-safe wrapper around the locale-aware formatDate from lib/date */
const formatDate = (d: string | null | undefined): string => (d ? _formatDate(d) : '—');

function stageBadgeClass(stage: string): string {
    switch (stage) {
        case 'Pre-Exit':  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        case 'Last Week': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        case 'Post-Exit': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        default:          return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
}

function priorityDot(priority: string): string {
    switch (priority) {
        case 'High':   return 'bg-red-500';
        case 'Medium': return 'bg-amber-500';
        case 'Low':    return 'bg-green-500';
        default:       return 'bg-gray-400';
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

const STAGES: Array<OffboardingTask['stage']> = ['Pre-Exit', 'Last Week', 'Post-Exit'];

interface TaskGroupProps {
    stage: OffboardingTask['stage'];
    tasks: OffboardingTask[];
    onToggle: (taskId: string, completed: boolean) => void;
    updatingId: string | null;
}

const TaskGroup: React.FC<TaskGroupProps> = ({ stage, tasks, onToggle, updatingId }) => {
    const { t } = useTranslation('offboarding');
    const [collapsed, setCollapsed] = useState(false);
    const completedCount = tasks.filter((t) => t.completed).length;

    return (
        <div className="mb-4">
            {/* Stage header */}
            <button
                onClick={() => setCollapsed((v) => !v)}
                className="w-full flex items-center justify-between text-left mb-2"
            >
                <div className="flex items-center gap-2">
                    {collapsed ? <ChevronRight size={14} className="text-text-muted-light dark:text-text-muted-dark" /> : <ChevronDown size={14} className="text-text-muted-light dark:text-text-muted-dark" />}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stageBadgeClass(stage)}`}>
                        {t(`stages.${stage}`, stage)}
                    </span>
                    <span className="text-xs text-text-muted-light dark:text-text-muted-dark">
                        {t('checklist.doneCount', { completed: completedCount, total: tasks.length })}
                    </span>
                </div>
            </button>

            {!collapsed && (
                <div className="space-y-2">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                                task.completed
                                    ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50 opacity-70'
                                    : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark'
                            }`}
                        >
                            {/* Checkbox */}
                            <button
                                onClick={() => !task.completed && onToggle(task.id, true)}
                                disabled={task.completed || updatingId === task.id}
                                role="checkbox"
                                aria-checked={task.completed}
                                aria-label={task.title}
                                className="mt-0.5 shrink-0 text-text-muted-light dark:text-text-muted-dark hover:text-primary disabled:cursor-default transition-colors"
                                title={task.completed ? t('checklist.completedTitle') : t('checklist.markComplete')}
                            >
                                {updatingId === task.id ? (
                                    <Loader2 size={18} className="animate-spin text-primary" />
                                ) : task.completed ? (
                                    <CheckSquare size={18} className="text-green-600 dark:text-green-400" />
                                ) : (
                                    <Square size={18} />
                                )}
                            </button>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${task.completed ? 'line-through text-text-muted-light dark:text-text-muted-dark' : 'text-text-light dark:text-text-dark'}`}>
                                    {task.title}
                                </p>
                                {task.description && (
                                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5 line-clamp-2">
                                        {task.description}
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                    {task.dueDate && (
                                        <span className="flex items-center gap-1 text-xs text-text-muted-light dark:text-text-muted-dark">
                                            <Calendar size={11} />
                                            {formatDate(task.dueDate)}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1 text-xs text-text-muted-light dark:text-text-muted-dark">
                                        <User size={11} />
                                        {task.assignee}
                                    </span>
                                    {task.priority && (
                                        <span className="flex items-center gap-1 text-xs">
                                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${priorityDot(task.priority)}`} />
                                            <span className="text-text-muted-light dark:text-text-muted-dark">{task.priority}</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Completed badge */}
                            {task.completed && (
                                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────────
// Exit Interview Form
// ──────────────────────────────────────────────────────────────────────────────

const EXIT_REASONS = [
    'Better Opportunity',
    'Career Change',
    'Compensation',
    'Manager',
    'Relocation',
    'Personal',
    'Other',
];

interface ExitInterviewFormProps {
    onSave: (payload: Record<string, unknown>) => void;
    isSaving: boolean;
}

const ExitInterviewForm: React.FC<ExitInterviewFormProps> = ({ onSave, isSaving }) => {
    const { t } = useTranslation('offboarding');
    const [reason, setReason] = useState('');
    const [rating, setRating] = useState<number>(0);
    const [wouldRehire, setWouldRehire] = useState<boolean | null>(null);
    const [feedback, setFeedback] = useState('');
    const [improvements, setImprovements] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            reasonForLeaving: reason || undefined,
            satisfactionRating: rating || undefined,
            wouldRehire: wouldRehire,
            feedback: feedback || undefined,
            improvementsSuggested: improvements || undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Reason */}
            <div>
                <label className="block text-xs font-medium text-text-muted-light dark:text-text-muted-dark mb-1.5">
                    {t('exitInterview.reasonForLeaving')}
                </label>
                <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                    <option value="">{t('exitInterview.selectReason')}</option>
                    {EXIT_REASONS.map((r) => (
                        <option key={r} value={r}>{t(`reasons.${r}`, r)}</option>
                    ))}
                </select>
            </div>

            {/* Satisfaction Rating */}
            <div>
                <label className="block text-xs font-medium text-text-muted-light dark:text-text-muted-dark mb-1.5">
                    {t('exitInterview.satisfaction')} {t('exitInterview.satisfactionHint')}
                </label>
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => setRating(n)}
                            className={`p-1 rounded transition-colors ${
                                rating >= n
                                    ? 'text-amber-500'
                                    : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'
                            }`}
                        >
                            <Star size={22} fill={rating >= n ? 'currentColor' : 'none'} />
                        </button>
                    ))}
                    {rating > 0 && (
                        <span className="self-center ml-1 text-xs text-text-muted-light dark:text-text-muted-dark">
                            {rating}/5
                        </span>
                    )}
                </div>
            </div>

            {/* Would Rehire */}
            <div>
                <label className="block text-xs font-medium text-text-muted-light dark:text-text-muted-dark mb-1.5">
                    {t('exitInterview.wouldRehire')}
                </label>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => setWouldRehire(true)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                            wouldRehire === true
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                : 'border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark hover:border-green-400'
                        }`}
                    >
                        <ThumbsUp size={14} /> {t('exitInterview.yes')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setWouldRehire(false)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                            wouldRehire === false
                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                : 'border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark hover:border-red-400'
                        }`}
                    >
                        <ThumbsDown size={14} /> {t('exitInterview.no')}
                    </button>
                </div>
            </div>

            {/* Feedback */}
            <div>
                <label className="block text-xs font-medium text-text-muted-light dark:text-text-muted-dark mb-1.5">
                    {t('exitInterview.feedback')}
                </label>
                <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                    placeholder={t('exitInterview.feedbackPlaceholder')}
                    className="w-full px-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
            </div>

            {/* Improvements */}
            <div>
                <label className="block text-xs font-medium text-text-muted-light dark:text-text-muted-dark mb-1.5">
                    {t('exitInterview.improvements')}
                </label>
                <textarea
                    value={improvements}
                    onChange={(e) => setImprovements(e.target.value)}
                    rows={3}
                    placeholder={t('exitInterview.improvementsPlaceholder')}
                    className="w-full px-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
            </div>

            <div className="flex justify-end pt-1">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
                >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                    {t('exitInterview.save')}
                </button>
            </div>
        </form>
    );
};

// ──────────────────────────────────────────────────────────────────────────────
// Exit Interview Summary Card
// ──────────────────────────────────────────────────────────────────────────────

const ExitInterviewSummary: React.FC<{ interview: ExitInterview }> = ({ interview }) => {
    const { t } = useTranslation('offboarding');
    return (
        <div className="space-y-3 text-sm">
            {interview.reasonForLeaving && (
                <div>
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-0.5">{t('exitInterview.reasonForLeaving')}</p>
                    <p className="font-medium text-text-light dark:text-text-dark">
                        {t(`reasons.${interview.reasonForLeaving}`, interview.reasonForLeaving)}
                    </p>
                </div>
            )}
            {interview.satisfactionRating && (
                <div>
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-0.5">{t('exitInterview.summary.satisfactionRating')}</p>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                                key={n}
                                size={16}
                                className={n <= interview.satisfactionRating! ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'}
                                fill={n <= interview.satisfactionRating! ? 'currentColor' : 'none'}
                            />
                        ))}
                        <span className="text-xs text-text-muted-light dark:text-text-muted-dark ml-1">
                            {interview.satisfactionRating}/5
                        </span>
                    </div>
                </div>
            )}
            {interview.wouldRehire !== null && (
                <div>
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-0.5">{t('exitInterview.summary.wouldRehireLabel')}</p>
                    <div className={`flex items-center gap-1.5 font-medium ${interview.wouldRehire ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {interview.wouldRehire ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
                        {interview.wouldRehire ? t('exitInterview.yes') : t('exitInterview.no')}
                    </div>
                </div>
            )}
            {interview.feedback && (
                <div>
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-0.5">{t('exitInterview.feedback')}</p>
                    <p className="text-text-light dark:text-text-dark leading-relaxed">{interview.feedback}</p>
                </div>
            )}
            {interview.improvementsSuggested && (
                <div>
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-0.5">{t('exitInterview.improvements')}</p>
                    <p className="text-text-light dark:text-text-dark leading-relaxed">{interview.improvementsSuggested}</p>
                </div>
            )}
            <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-2">
                {t('exitInterview.summary.conducted', { date: formatDate(interview.conductedAt) })}
            </p>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────────
// Main OffboardingTab component
// ──────────────────────────────────────────────────────────────────────────────

export const OffboardingTab: React.FC<OffboardingTabProps> = ({
    employee,
    tasks,
    exitInterview,
    progress,
    isLoading,
    onUpdateTask,
    onSaveExitInterview,
    showToast,
}) => {
    const { t } = useTranslation('offboarding');
    const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
    const [isSavingInterview, setIsSavingInterview] = useState(false);

    const handleToggleTask = async (taskId: string, completed: boolean) => {
        setUpdatingTaskId(taskId);
        try {
            await onUpdateTask(taskId, { completed });
        } catch {
            showToast(t('toast.updateTaskFailed'), 'error');
        } finally {
            setUpdatingTaskId(null);
        }
    };

    const handleSaveInterview = async (payload: Record<string, unknown>) => {
        setIsSavingInterview(true);
        try {
            await onSaveExitInterview(payload);
            showToast(t('toast.interviewSaved'), 'success');
        } catch {
            showToast(t('toast.interviewSaveFailed'), 'error');
        } finally {
            setIsSavingInterview(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 size={28} className="animate-spin text-primary" />
            </div>
        );
    }

    const tasksByStage = useMemo(
        () => STAGES.reduce<Record<string, OffboardingTask[]>>((acc, stage) => {
            acc[stage] = tasks.filter((t) => t.stage === stage);
            return acc;
        }, {}),
        [tasks],
    );

    return (
        <div className="space-y-6">

            {/* ── 1. Termination Info Card ──────────────────────────────────── */}
            <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                <h2 className="text-base font-bold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-500" />
                    {t('termination.details')}
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-0.5">{t('termination.status')}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            employee.status === 'Notice Period'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                            {employee.status}
                        </span>
                    </div>
                    <div>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-0.5">{t('termination.reason')}</p>
                        <p className="font-medium text-text-light dark:text-text-dark">{employee.terminationReason ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-0.5">{t('termination.lastWorkingDay')}</p>
                        <p className="font-medium text-text-light dark:text-text-dark flex items-center gap-1">
                            <Calendar size={13} />
                            {formatDate(employee.lastWorkingDay)}
                        </p>
                    </div>
                    {employee.terminationDate && (
                        <div>
                            <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-0.5">{t('termination.terminationDate')}</p>
                            <p className="font-medium text-text-light dark:text-text-dark flex items-center gap-1">
                                <Clock size={13} />
                                {formatDate(employee.terminationDate)}
                            </p>
                        </div>
                    )}
                    {employee.offboardingInitiatedAt && (
                        <div>
                            <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-0.5">{t('termination.initiated')}</p>
                            <p className="font-medium text-text-light dark:text-text-dark">
                                {formatDate(employee.offboardingInitiatedAt)}
                            </p>
                        </div>
                    )}
                    {employee.terminationNotes && (
                        <div className="col-span-2">
                            <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-0.5">{t('termination.notes')}</p>
                            <p className="text-text-light dark:text-text-dark">{employee.terminationNotes}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── 2. Offboarding Tasks ─────────────────────────────────────── */}
            <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                        <CheckSquare size={16} className="text-primary" />
                        {t('checklist.title')}
                    </h2>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-text-light dark:text-text-dark">
                            {progress.percentage}<span className="text-sm font-normal text-text-muted-light dark:text-text-muted-dark">%</span>
                        </p>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
                            {t('checklist.tasksSuffix', { completed: progress.completed, total: progress.total })}
                        </p>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full mb-5 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${
                            progress.percentage === 100
                                ? 'bg-green-500'
                                : 'bg-primary'
                        }`}
                        style={{ width: `${progress.percentage}%` }}
                    />
                </div>

                {progress.percentage === 100 && (
                    <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2 mb-4">
                        <CheckCircle2 size={16} />
                        {t('checklist.allComplete')}
                    </div>
                )}

                {tasks.length === 0 ? (
                    <p className="text-sm text-text-muted-light dark:text-text-muted-dark text-center py-4">
                        {t('checklist.noTasks')}
                    </p>
                ) : (
                    STAGES.map((stage) => {
                        const stageTasks = tasksByStage[stage] ?? [];
                        return stageTasks.length > 0 ? (
                            <TaskGroup
                                key={stage}
                                stage={stage}
                                tasks={stageTasks}
                                onToggle={handleToggleTask}
                                updatingId={updatingTaskId}
                            />
                        ) : null;
                    })
                )}
            </div>

            {/* ── 3. Exit Interview ─────────────────────────────────────────── */}
            <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                <h2 className="text-base font-bold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
                    <FileText size={16} className="text-primary" />
                    {t('exitInterview.title')}
                </h2>

                {exitInterview ? (
                    <ExitInterviewSummary interview={exitInterview} />
                ) : (
                    <ExitInterviewForm
                        onSave={handleSaveInterview}
                        isSaving={isSavingInterview}
                    />
                )}
            </div>
        </div>
    );
};
