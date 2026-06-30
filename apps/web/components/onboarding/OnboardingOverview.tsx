import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Users } from 'lucide-react';
import { Avatar } from '../Avatar';
import { OnboardingOverviewProps } from './OnboardingTypes';

export const OnboardingOverview: React.FC<OnboardingOverviewProps> = ({
    employees,
    tasks,
    documents,
    onSelectEmployee,
}) => {
    const { t } = useTranslation(['onboarding', 'common']);
    // Build per-employee stats from tasks & documents
    const employeeStats = employees.map(emp => {
        const empTasks = tasks.filter(t => t.employeeId === emp.id);
        const completedTasks = empTasks.filter(t => t.completed).length;
        const totalTasks = empTasks.length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Breakdown by assignee type
        const selfTasks = empTasks.filter(t => t.assignee === 'Employee');
        const selfCompleted = selfTasks.filter(t => t.completed).length;
        const adminTasks = empTasks.filter(t => t.assignee !== 'Employee');
        const adminCompleted = adminTasks.filter(t => t.completed).length;

        const empDocs = documents.filter(d => d.employeeId === emp.id);
        const uploadedDocs = empDocs.filter(d => d.status !== 'Pending').length;
        const totalDocs = empDocs.length;

        const status: 'Not Started' | 'In Progress' | 'Completed' =
            emp.onboardingStatus === 'Completed' ? 'Completed' :
            completedTasks === 0 && uploadedDocs === 0 ? 'Not Started' :
            progress === 100 && uploadedDocs === totalDocs ? 'Completed' :
            'In Progress';

        return { emp, completedTasks, totalTasks, progress, selfCompleted, selfTotal: selfTasks.length, adminCompleted, adminTotal: adminTasks.length, uploadedDocs, totalDocs, status };
    });

    // Only show employees that actually have onboarding tasks
    const onboardingEmployees = employeeStats.filter(s => s.totalTasks > 0);

    if (onboardingEmployees.length === 0) {
        return (
            <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-12 text-center">
                <Users size={48} className="mx-auto text-text-muted-light dark:text-text-muted-dark mb-4" />
                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
                    {t('overview.noOnboarding')}
                </h3>
                <p className="text-text-muted-light dark:text-text-muted-dark">
                    {t('overview.noOnboardingHint')}
                </p>
            </div>
        );
    }

    const translateOnboardingStatus = (status: string): string => {
        const statusMap: Record<string, string> = {
            'Not Started': t('common:status.notStarted'),
            'In Progress': t('common:status.inProgress'),
            'Completed': t('common:status.completed'),
        };
        return statusMap[status] || status;
    };

    const statusBadge = (status: string) => {
        const styles = {
            'Not Started': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
            'In Progress': 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
            'Completed': 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
        }[status] || 'bg-gray-100 text-gray-600';

        return (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles}`}>
                {translateOnboardingStatus(status)}
            </span>
        );
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {onboardingEmployees.map(({ emp, progress, selfCompleted, selfTotal, adminCompleted, adminTotal, uploadedDocs, totalDocs, status }) => (
                <button
                    key={emp.id}
                    onClick={() => onSelectEmployee(emp.id)}
                    className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-5 text-left hover:border-primary/50 hover:shadow-md transition-all group"
                >
                    {/* Header: avatar + info + badge */}
                    <div className="flex items-start gap-3 mb-4">
                        <Avatar src={emp.avatar} name={emp.name} size="lg" />
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-text-light dark:text-text-dark truncate group-hover:text-primary transition-colors">
                                {emp.name}
                            </h3>
                            <p className="text-sm text-text-muted-light dark:text-text-muted-dark truncate">
                                {emp.role} &middot; {emp.department}
                            </p>
                        </div>
                        {statusBadge(status)}
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-text-muted-light dark:text-text-muted-dark">{t('overview.progress')}</span>
                            <span className="font-medium text-text-light dark:text-text-dark">{progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    progress === 100 ? 'bg-green-500' : progress > 0 ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'
                                }`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted-light dark:text-text-muted-dark">
                        <div className="flex items-center gap-1.5" title={t('overview.tasksEmployeeTooltip')}>
                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                            <span>{t('overview.employee')} {selfCompleted}/{selfTotal}</span>
                        </div>
                        <div className="flex items-center gap-1.5" title={t('overview.tasksItHrTooltip')}>
                            <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                            <span>{t('overview.itHr')} {adminCompleted}/{adminTotal}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <FileText size={12} className={uploadedDocs === totalDocs ? 'text-green-500' : ''} />
                            <span>{uploadedDocs}/{totalDocs} {t('overview.docs')}</span>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
};
