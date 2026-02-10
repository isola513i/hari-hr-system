import React from 'react';
import {
    CheckCircle2,
    Clock,
    FileText,
    Calendar,
    Trophy,
    ArrowRight,
    CircleDot,
    Circle,
} from 'lucide-react';
import type { OnboardingTask } from '@hari/shared-types';
import { FlowStage } from './OnboardingTypes';

export const FlowGraph: React.FC<{ tasks: OnboardingTask[] }> = ({ tasks }) => {
    // Group tasks by stage
    const stageMap = tasks.reduce((acc, task) => {
        if (!acc[task.stage]) acc[task.stage] = [];
        acc[task.stage]!.push({ title: task.title, completed: task.completed });
        return acc;
    }, {} as Record<string, { title: string; completed: boolean }[]>);

    const stages: FlowStage[] = [
        {
            id: 'pre-boarding',
            label: 'Pre-boarding',
            icon: <FileText size={22} />,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            borderColor: 'border-blue-200 dark:border-blue-800',
            tasks: stageMap['Pre-boarding'] || [],
        },
        {
            id: 'week-1',
            label: 'Week 1',
            icon: <Calendar size={22} />,
            color: 'text-violet-600 dark:text-violet-400',
            bgColor: 'bg-violet-50 dark:bg-violet-900/20',
            borderColor: 'border-violet-200 dark:border-violet-800',
            tasks: stageMap['Week 1'] || [],
        },
        {
            id: 'month-1',
            label: 'Month 1',
            icon: <Clock size={22} />,
            color: 'text-amber-600 dark:text-amber-400',
            bgColor: 'bg-amber-50 dark:bg-amber-900/20',
            borderColor: 'border-amber-200 dark:border-amber-800',
            tasks: stageMap['Month 1'] || [],
        },
        {
            id: 'completed',
            label: 'Completed',
            icon: <Trophy size={22} />,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
            borderColor: 'border-emerald-200 dark:border-emerald-800',
            tasks: [],
        },
    ];

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const allDone = totalTasks > 0 && completedTasks === totalTasks;

    // Determine which stage is "active" (first stage with incomplete tasks)
    const getStageStatus = (stage: FlowStage): 'done' | 'active' | 'pending' => {
        if (stage.id === 'completed') return allDone ? 'done' : 'pending';
        if (stage.tasks.length === 0) return 'pending';
        const allCompleted = stage.tasks.every(t => t.completed);
        const someCompleted = stage.tasks.some(t => t.completed);
        if (allCompleted) return 'done';
        if (someCompleted) return 'active';
        // Check if previous stages are done
        const stageIndex = stages.findIndex(s => s.id === stage.id);
        const previousStages = stages.slice(0, stageIndex).filter(s => s.id !== 'completed');
        const allPreviousDone = previousStages.every(s => s.tasks.length === 0 || s.tasks.every(t => t.completed));
        return allPreviousDone ? 'active' : 'pending';
    };

    return (
        <div className="space-y-6">
            {/* Flow Overview Card */}
            <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Onboarding Pipeline</h2>
                    <span className="text-sm text-text-muted-light dark:text-text-muted-dark">
                        {completedTasks}/{totalTasks} tasks completed
                    </span>
                </div>
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-6">
                    Visual overview of the onboarding journey from pre-boarding to full integration.
                </p>

                {/* Horizontal Flow Pipeline */}
                <div className="flex items-start gap-0 overflow-x-auto pb-4">
                    {stages.map((stage, index) => {
                        const status = getStageStatus(stage);
                        const stageCompleted = stage.tasks.filter(t => t.completed).length;
                        const stageTotal = stage.tasks.length;
                        const stageProgress = stageTotal > 0 ? Math.round((stageCompleted / stageTotal) * 100) : (status === 'done' ? 100 : 0);

                        return (
                            <React.Fragment key={stage.id}>
                                {/* Stage Card */}
                                <div className={`flex-shrink-0 w-56 rounded-xl border-2 transition-all duration-300 ${
                                    status === 'done'
                                        ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10'
                                        : status === 'active'
                                            ? `${stage.borderColor} ${stage.bgColor} ring-2 ring-offset-2 ring-offset-background-light dark:ring-offset-background-dark ring-primary/30`
                                            : 'border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark opacity-60'
                                }`}>
                                    {/* Stage Header */}
                                    <div className="p-4 pb-3">
                                        <div className="flex items-center gap-2.5 mb-2">
                                            {/* Status indicator */}
                                            <div className={`p-2 rounded-lg ${
                                                status === 'done'
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                                    : status === 'active'
                                                        ? `${stage.bgColor} ${stage.color}`
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                            }`}>
                                                {status === 'done' ? <CheckCircle2 size={22} /> : stage.icon}
                                            </div>
                                            <div>
                                                <h3 className={`text-sm font-bold ${
                                                    status === 'done'
                                                        ? 'text-emerald-700 dark:text-emerald-400'
                                                        : status === 'active'
                                                            ? 'text-text-light dark:text-text-dark'
                                                            : 'text-text-muted-light dark:text-text-muted-dark'
                                                }`}>
                                                    {stage.label}
                                                </h3>
                                                <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
                                                    {stage.id === 'completed'
                                                        ? (allDone ? 'All done!' : 'Pending')
                                                        : `${stageCompleted}/${stageTotal} tasks`
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        {stage.id !== 'completed' && stageTotal > 0 && (
                                            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                                                        status === 'done' ? 'bg-emerald-500' : 'bg-primary'
                                                    }`}
                                                    style={{ width: `${stageProgress}%` }}
                                                />
                                            </div>
                                        )}
                                        {stage.id === 'completed' && (
                                            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ease-out ${allDone ? 'bg-emerald-500' : ''}`}
                                                    style={{ width: allDone ? '100%' : '0%' }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Task List */}
                                    {stage.tasks.length > 0 && (
                                        <div className="px-4 pb-4 space-y-1.5">
                                            {stage.tasks.map((task, taskIdx) => (
                                                <div key={taskIdx} className="flex items-start gap-2">
                                                    {task.completed
                                                        ? <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                                        : status === 'active'
                                                            ? <CircleDot size={14} className="text-primary mt-0.5 flex-shrink-0" />
                                                            : <Circle size={14} className="text-gray-300 dark:text-gray-600 mt-0.5 flex-shrink-0" />
                                                    }
                                                    <span className={`text-xs leading-tight ${
                                                        task.completed
                                                            ? 'line-through text-text-muted-light dark:text-text-muted-dark'
                                                            : 'text-text-light dark:text-text-dark'
                                                    }`}>
                                                        {task.title}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {stage.id === 'completed' && (
                                        <div className="px-4 pb-4 text-center">
                                            {allDone ? (
                                                <div className="py-3">
                                                    <Trophy size={28} className="text-emerald-500 mx-auto mb-1" />
                                                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Onboarding Complete!</p>
                                                </div>
                                            ) : (
                                                <div className="py-3">
                                                    <Trophy size={28} className="text-gray-300 dark:text-gray-600 mx-auto mb-1" />
                                                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark">Complete all stages</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Arrow Connector */}
                                {index < stages.length - 1 && (
                                    <div className="flex-shrink-0 flex items-center justify-center w-10 self-center pt-2">
                                        <div className="flex items-center">
                                            <div className={`w-5 h-0.5 ${
                                                getStageStatus(stages[index]!) === 'done'
                                                    ? 'bg-emerald-400 dark:bg-emerald-600'
                                                    : 'bg-border-light dark:bg-border-dark'
                                            }`} />
                                            <ArrowRight size={16} className={`-ml-1 ${
                                                getStageStatus(stages[index]!) === 'done'
                                                    ? 'text-emerald-400 dark:text-emerald-600'
                                                    : 'text-border-light dark:text-border-dark'
                                            }`} />
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Stage Detail Cards (vertical breakdown) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stages.filter(s => s.id !== 'completed').map(stage => {
                    const status = getStageStatus(stage);
                    const stageCompleted = stage.tasks.filter(t => t.completed).length;
                    const stageTotal = stage.tasks.length;

                    return (
                        <div
                            key={stage.id}
                            className={`bg-card-light dark:bg-card-dark rounded-xl border shadow-sm overflow-hidden ${
                                status === 'done'
                                    ? 'border-emerald-200 dark:border-emerald-800'
                                    : status === 'active'
                                        ? stage.borderColor
                                        : 'border-border-light dark:border-border-dark'
                            }`}
                        >
                            {/* Colored top bar */}
                            <div className={`h-1 ${
                                status === 'done'
                                    ? 'bg-emerald-500'
                                    : status === 'active'
                                        ? 'bg-primary'
                                        : 'bg-gray-200 dark:bg-gray-700'
                            }`} />

                            <div className="p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${
                                            status === 'done'
                                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                                : `${stage.bgColor} ${stage.color}`
                                        }`}>
                                            {status === 'done' ? <CheckCircle2 size={18} /> : stage.icon}
                                        </div>
                                        <h3 className="font-semibold text-text-light dark:text-text-dark">{stage.label}</h3>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                        status === 'done'
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                            : status === 'active'
                                                ? `${stage.bgColor} ${stage.color}`
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                    }`}>
                                        {stageTotal > 0 ? `${stageCompleted}/${stageTotal}` : '0'}
                                    </span>
                                </div>

                                <div className="space-y-2.5">
                                    {stage.tasks.map((task, idx) => (
                                        <div key={idx} className="flex items-start gap-2.5">
                                            {task.completed
                                                ? <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                                : status === 'active'
                                                    ? <CircleDot size={16} className="text-primary mt-0.5 flex-shrink-0" />
                                                    : <Circle size={16} className="text-gray-300 dark:text-gray-600 mt-0.5 flex-shrink-0" />
                                            }
                                            <span className={`text-sm ${
                                                task.completed
                                                    ? 'line-through text-text-muted-light dark:text-text-muted-dark'
                                                    : 'text-text-light dark:text-text-dark'
                                            }`}>
                                                {task.title}
                                            </span>
                                        </div>
                                    ))}
                                    {stage.tasks.length === 0 && (
                                        <p className="text-sm text-text-muted-light dark:text-text-muted-dark italic">
                                            No tasks assigned yet
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
