import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plane, DollarSign } from 'lucide-react';

interface MyRequestItem {
  id: string;
  kind: 'leave' | 'expense';
  label: string;
  subtitle: string;
  status: string;
  createdAt: string;
}

interface MyRecentRequestsProps {
  myRequests: MyRequestItem[];
}

export const MyRecentRequests: React.FC<MyRecentRequestsProps> = ({ myRequests }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();

  return (
    <div className="lg:col-span-2 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
          <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{t('dashboard:employee.myRecentRequests')}</h2>
            <button onClick={() => navigate('/time-off')} className="text-xs text-primary font-medium hover:underline">{t('common:buttons.viewAll')}</button>
          </div>
          <div className="p-4 space-y-3">
            {myRequests.length > 0 ? (
              myRequests.slice(0, 4).map(req => {
                const statusColor = req.status === 'Approved' || req.status === 'Reimbursed'
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                  : req.status === 'Rejected' || req.status === 'Cancelled'
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400';
                const badgeColor = req.status === 'Approved' || req.status === 'Reimbursed'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : req.status === 'Rejected' || req.status === 'Cancelled'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
                return (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${statusColor}`}>
                        {req.kind === 'expense' ? <DollarSign size={18} /> : <Plane size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-light dark:text-text-dark">{req.label}</p>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{req.subtitle}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${badgeColor}`}>
                      {t(`common:status.${req.status === 'Cancel Requested' ? 'cancelRequested' : req.status === 'Manager Approved' ? 'managerApproved' : req.status.toLowerCase()}`, { defaultValue: req.status })}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-text-muted-light">{t('dashboard:employee.noRequestsYet')}</div>
            )}
          </div>
        </div>
  );
};
