import React from 'react';
import { useTranslation } from 'react-i18next';
import { Timer, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { OTRequest } from '../../hooks/queries/ot';

interface MyOTRequestsCardProps {
  myOTRequests: OTRequest[];
  onRequestOT: () => void;
}

export const MyOTRequestsCard: React.FC<MyOTRequestsCardProps> = ({ myOTRequests, onRequestOT }) => {
  const { t } = useTranslation(['dashboard', 'common']);

  return (
    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
        <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/20 text-amber-500 rounded-lg">
              <Timer size={16} />
            </div>
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{t('dashboard:employee.myOTRequests')}</h2>
          </div>
          <button
            onClick={onRequestOT}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Timer size={12} />
            {t('dashboard:employee.requestOT')}
          </button>
        </div>
        <div className="p-4">
          {myOTRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-text-muted-light dark:text-text-muted-dark">
              <Timer size={28} className="mb-2 opacity-20" />
              <p className="text-sm">{t('dashboard:employee.noOTRequests')}</p>
              <button onClick={onRequestOT} className="mt-2 text-xs text-primary hover:underline font-medium">{t('dashboard:employee.submitFirstOT')}</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {myOTRequests.slice(0, 3).map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      req.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : req.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    }`}>
                      {req.status === 'approved' ? <CheckCircle2 size={14} /> : req.status === 'rejected' ? <XCircle size={14} /> : <Clock size={14} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-light dark:text-text-dark">
                        {req.plannedHours}h OT · <span className="text-text-muted-light dark:text-text-muted-dark">{req.otType === 'holiday' ? '3×' : '1.5×'}</span>
                      </p>
                      <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{req.date} · {req.plannedStart}–{req.plannedEnd}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ml-2 ${
                    req.status === 'approved' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : req.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                  }`}>
                    {t(`dashboard:employee.otStatus.${req.status}`, req.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  );
};
