import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, RotateCw } from 'lucide-react';
import { useHolidays } from '../hooks/queries';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const Holidays: React.FC = () => {
  const { t } = useTranslation(['leave']);
  const { data: holidays = [], isLoading } = useHolidays();

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
          <Calendar className="text-primary" size={28} />
          {t('leave:holidays.title')}
        </h1>
        <p className="text-text-muted-light dark:text-text-muted-dark mt-1">
          {t('leave:holidays.subtitle')}
        </p>
      </div>

      {/* Table */}
      <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
        {holidays.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Calendar className="text-primary" size={28} />
            </div>
            <p className="text-text-muted-light dark:text-text-muted-dark text-sm">
              {t('leave:holidays.noHolidays')}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  {t('leave:holidays.date')}
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  {t('leave:holidays.name')}
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  {t('leave:holidays.recurring')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {holidays.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-text-primary-light dark:text-text-primary-dark font-medium">
                    {h.endDate ? `${formatDate(h.date)} – ${formatDate(h.endDate)}` : formatDate(h.date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-primary-light dark:text-text-primary-dark">
                    {h.name}
                  </td>
                  <td className="px-6 py-4">
                    {h.isRecurring ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                        <RotateCw size={12} />
                        {t('leave:holidays.recurringYes')}
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted-light dark:text-text-muted-dark">
                        {t('leave:holidays.recurringNo')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Holidays;
