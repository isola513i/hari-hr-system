import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plane, Wallet, MessageSquare } from 'lucide-react';

interface EmployeeStatsCardsProps {
  employeeStats: {
    leaveBalance: number;
    nextPayday: string | null;
    pendingReviews: number;
    pendingSurveys: number;
  };
}

export const EmployeeStatsCards: React.FC<EmployeeStatsCardsProps> = ({ employeeStats }) => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();

  const cardKeyDown = (path: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(path);
    }
  };
  const cardClass = 'bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 sm:p-6 shadow-sm flex items-center justify-between cursor-pointer hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div role="button" tabIndex={0} aria-label={t('dashboard:employee.leaveBalance')} className={cardClass} onClick={() => navigate('/time-off')} onKeyDown={cardKeyDown('/time-off')}>
          <div>
            <p className="text-text-muted-light dark:text-text-muted-dark text-xs sm:text-sm font-medium mb-1">{t('dashboard:employee.leaveBalance')}</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">{employeeStats.leaveBalance} <span className="text-xs sm:text-sm font-normal text-text-muted-light">{t('dashboard:employee.daysUnit')}</span></h3>
          </div>
          <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg">
            <Plane size={20} className="sm:w-6 sm:h-6" />
          </div>
        </div>
        <div role="button" tabIndex={0} aria-label={t('dashboard:employee.nextPayday')} className={cardClass} onClick={() => navigate('/payroll')} onKeyDown={cardKeyDown('/payroll')}>
          <div>
            <p className="text-text-muted-light dark:text-text-muted-dark text-xs sm:text-sm font-medium mb-1">{t('dashboard:employee.nextPayday')}</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">{employeeStats.nextPayday ? new Date(employeeStats.nextPayday + 'T00:00:00').toLocaleDateString(i18n.language === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric' }) : '—'}</h3>
          </div>
          <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 text-green-500 rounded-lg">
            <Wallet size={20} className="sm:w-6 sm:h-6" />
          </div>
        </div>
        <div role="button" tabIndex={0} aria-label={t('dashboard:employee.pendingSurveys')} className={cardClass} onClick={() => navigate('/surveys')} onKeyDown={cardKeyDown('/surveys')}>
          <div>
            <p className="text-text-muted-light dark:text-text-muted-dark text-xs sm:text-sm font-medium mb-1">{t('dashboard:employee.pendingSurveys')}</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">{employeeStats.pendingSurveys}</h3>
          </div>
          <div className="p-2 sm:p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-lg">
            <MessageSquare size={20} className="sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>
  );
};
