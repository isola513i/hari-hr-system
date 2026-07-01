import React from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../Avatar';
import { StatusIndicator } from '../StatusIndicator';
import { SkeletonRow } from '../Skeleton';
import { Employee, MyTeamHierarchy, AvailabilityStatus } from '../../types';

interface MyTeamCardProps {
  teamHierarchy: MyTeamHierarchy | null;
  myTeam: Employee[];
  isTeamLoading: boolean;
  getStatus: (employeeId: string) => AvailabilityStatus;
  getStatusMessage: (employeeId: string) => string;
}

export const MyTeamCard: React.FC<MyTeamCardProps> = ({
  teamHierarchy,
  myTeam,
  isTeamLoading,
  getStatus,
  getStatusMessage,
}) => {
  const { t } = useTranslation(['dashboard', 'common']);

  return (
    <div className="lg:col-span-1 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
          <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{t('dashboard:employee.myTeam')}</h2>
            {teamHierarchy?.stats && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {teamHierarchy.stats.totalDirectReports > 0
                  ? t('dashboard:employee.reports', { count: teamHierarchy.stats.totalDirectReports })
                  : t('dashboard:employee.peers', { count: teamHierarchy.stats.peersCount })}
              </span>
            )}
          </div>
          <div className="p-4 space-y-3">
            {isTeamLoading && (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            )}
            {/* Manager info */}
            {!isTeamLoading && teamHierarchy?.manager && (
              <div className="flex items-center gap-3 pb-3 border-b border-border-light dark:border-border-dark">
                <div className="relative">
                  <Avatar
                    src={teamHierarchy.manager.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(teamHierarchy.manager.name)}&background=random`}
                    name={teamHierarchy.manager.name}
                    size="lg"
                  />
                  <StatusIndicator
                    status={getStatus(teamHierarchy.manager.id)}
                    statusMessage={getStatusMessage(teamHierarchy.manager.id)}
                    showTooltip
                    size="sm"
                    className="absolute -bottom-0.5 -right-0.5"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-light dark:text-text-dark">{teamHierarchy.manager.name}</p>
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{teamHierarchy.manager.role}</p>
                </div>
                <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded font-medium">{t('dashboard:employee.manager')}</span>
              </div>
            )}

            {/* Team members */}
            {!isTeamLoading && myTeam.map(teammate => (
              <div key={teammate.id} className="flex items-center gap-3">
                <div className="relative">
                  <Avatar src={teammate.avatar} name={teammate.name} size="lg" />
                  <StatusIndicator
                    status={getStatus(teammate.id)}
                    statusMessage={getStatusMessage(teammate.id)}
                    showTooltip
                    size="sm"
                    className="absolute -bottom-0.5 -right-0.5"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-light dark:text-text-dark">{teammate.name}</p>
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{teammate.role}</p>
                </div>
              </div>
            ))}
            {!isTeamLoading && myTeam.length === 0 && !teamHierarchy?.manager && (
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark text-center py-2">{t('dashboard:employee.noTeamMembers')}</p>
            )}
          </div>
        </div>
  );
};
