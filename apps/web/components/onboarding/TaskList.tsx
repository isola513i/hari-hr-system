import React from 'react';
import {
    CheckCircle2,
    Filter,
    Mail,
    AlertCircle,
    ExternalLink,
} from 'lucide-react';
import type { OnboardingTask } from '@hari/shared-types';
import { Dropdown } from '../ui/Dropdown';
import { TaskListProps } from './OnboardingTypes';

export const TaskList: React.FC<TaskListProps & { children?: React.ReactNode }> = ({
    children,
    tasks,
    filteredTasks,
    groupedTasks,
    userRole,
    progress,
    assigneeFilter,
    priorityFilter,
    dateFilter,
    onSetAssigneeFilter,
    onSetPriorityFilter,
    onSetDateFilter,
    onToggleTask,
    onCyclePriority,
    getStageIcon,
    formatDate,
    isDueSoon,
    isOverdue,
    getPriorityBadgeClass,
}) => {
    // Derived options for dropdowns
    const assigneeOptions = [
        { value: 'All', label: 'All Assignees' },
        { value: 'My Tasks', label: 'My Tasks' },
        ...Array.from(new Set(tasks.map(t => t.assignee))).filter(a => a !== 'HR').map(a => ({ value: a, label: a }))
    ];
    const priorityOptions = [
        { value: 'All', label: 'All Priorities' },
        { value: 'High', label: 'High' },
        { value: 'Medium', label: 'Medium' },
        { value: 'Low', label: 'Low' },
    ];
    const dateFilterOptions = [
        { value: 'All', label: 'All Dates' },
        { value: 'Overdue', label: 'Overdue' },
        { value: 'Due Soon', label: 'Due Soon' },
    ];

    return (
        <>
            {/* Progress Overview Card */}
            <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-text-light dark:text-text-dark">Overall Progress</h2>
                    <span className="text-2xl font-bold text-primary">{progress}%</span>
                </div>
                <div className="w-full bg-background-light dark:bg-background-dark h-3 rounded-full overflow-hidden">
                    <div
                        className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                {/* Detailed breakdown */}
                <div className="flex gap-8 mt-6 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                        <span className="text-text-muted-light dark:text-text-muted-dark">
                            Tasks ({filteredTasks.filter(t => t.completed).length}/{filteredTasks.length})
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left Column: Task Checklist */}
                <div className="xl:col-span-2 space-y-6">

                    {/* Filter Controls - Only show relevant filters for Admin */}
                    {userRole === 'HR_ADMIN' && (
                        <div className="flex flex-wrap items-center gap-3 bg-card-light dark:bg-card-dark p-4 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                            <div className="flex items-center gap-2 text-text-muted-light dark:text-text-muted-dark text-sm font-medium mr-2">
                                <Filter size={16} />
                                <span>Filter Tasks:</span>
                            </div>

                            <Dropdown
                                options={assigneeOptions}
                                value={assigneeFilter}
                                onChange={onSetAssigneeFilter}
                                width="w-40"
                            />

                            <Dropdown
                                options={priorityOptions}
                                value={priorityFilter}
                                onChange={onSetPriorityFilter}
                                width="w-40"
                            />

                            <Dropdown
                                options={dateFilterOptions}
                                value={dateFilter}
                                onChange={onSetDateFilter}
                                width="w-36"
                            />
                        </div>
                    )}

                    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-border-light dark:border-border-dark flex justify-between items-center">
                            <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Task Checklist</h2>
                            {userRole === 'HR_ADMIN' && (
                                <div className="flex gap-2">
                                    <span className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800">IT Setup</span>
                                    <span className="px-2 py-1 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded border border-purple-200 dark:border-purple-800">HR Ops</span>
                                </div>
                            )}
                        </div>

                        {Object.keys(groupedTasks).length === 0 && (
                            <div className="p-8 text-center text-text-muted-light dark:text-text-muted-dark">
                                <p>No tasks found.</p>
                            </div>
                        )}

                        <div className="divide-y divide-border-light dark:divide-border-dark">
                            {(Object.entries(groupedTasks) as [string, OnboardingTask[]][]).map(([stage, stageTasks]) => {
                                const visibleStageTotal = stageTasks.length;
                                const visibleStageCompleted = stageTasks.filter(t => t.completed).length;
                                const stageProgress = visibleStageTotal > 0 ? Math.round((visibleStageCompleted / visibleStageTotal) * 100) : 0;

                                return (
                                    <div key={stage} className="p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2 text-primary font-medium">
                                                {getStageIcon(stage)}
                                                <span>{stage}</span>
                                            </div>
                                            <div className="flex items-center gap-3" title={`${visibleStageCompleted} of ${visibleStageTotal} tasks completed`}>
                                                <span className="text-xs text-text-muted-light dark:text-text-muted-dark font-medium">{Math.round(stageProgress)}%</span>
                                                <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary rounded-full transition-all duration-500"
                                                        style={{ width: `${stageProgress}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3 pl-1">
                                            {stageTasks.map(task => {
                                                const overdue = isOverdue(task.dueDate) && !task.completed;
                                                const dueSoon = isDueSoon(task.dueDate) && !task.completed;

                                                return (
                                                    <div key={task.id} className={`flex items-start gap-3 group ${task.completed ? 'opacity-60' : ''}`}>
                                                        <button
                                                            onClick={() => onToggleTask(task.id)}
                                                            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border transition-colors flex items-center justify-center ${task.completed
                                                                ? 'bg-primary border-primary text-white'
                                                                : 'border-gray-300 dark:border-gray-600 hover:border-primary'
                                                                }`}
                                                        >
                                                            {task.completed && <CheckCircle2 size={14} />}
                                                        </button>
                                                        <div className="flex-1">
                                                            <p className={`text-sm font-medium ${task.completed ? 'line-through text-text-muted-light dark:text-text-muted-dark' : 'text-text-light dark:text-text-dark'}`}>
                                                                {task.title}
                                                            </p>
                                                            <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{task.description}</p>
                                                            {task.link && (
                                                                <a href={task.link} className="flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                                                                    Read Material <ExternalLink size={10} />
                                                                </a>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-text-muted-light dark:text-text-muted-dark">
                                                            {userRole === 'HR_ADMIN' && (
                                                                <button
                                                                    onClick={() => onCyclePriority(task.id)}
                                                                    className={`px-2 py-0.5 rounded border font-medium transition-colors ${getPriorityBadgeClass(task.priority)}`}
                                                                    title="Click to change priority"
                                                                >
                                                                    {task.priority}
                                                                </button>
                                                            )}

                                                            {userRole === 'HR_ADMIN' && (
                                                                <div className="flex items-center gap-1 bg-background-light dark:bg-background-dark px-2 py-0.5 rounded border border-border-light dark:border-border-dark">
                                                                    <Mail size={10} />
                                                                    {task.assignee}
                                                                </div>
                                                            )}

                                                            <span className={`flex items-center gap-1 font-medium ${task.completed ? 'text-text-muted-light' :
                                                                overdue ? 'text-accent-red bg-accent-red/10 px-2 py-0.5 rounded' :
                                                                    dueSoon ? 'text-accent-orange bg-accent-orange/10 px-2 py-0.5 rounded' : ''
                                                                }`}>
                                                                {(overdue || dueSoon) && !task.completed && <AlertCircle size={12} />}
                                                                {formatDate(task.dueDate)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: rendered via children */}
                {children && (
                    <div className="flex flex-col gap-6">
                        {children}
                    </div>
                )}
            </div>
        </>
    );
};
