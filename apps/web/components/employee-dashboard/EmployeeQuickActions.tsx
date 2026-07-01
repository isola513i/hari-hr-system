import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Palmtree, DollarSign, MessageSquare, Wallet } from 'lucide-react';

export const EmployeeQuickActions: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={() => navigate('/time-off')}
          className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
        >
          <div className="p-2 bg-accent-teal/10 text-accent-teal rounded-lg group-hover:bg-accent-teal group-hover:text-white transition-colors">
            <Palmtree size={20} />
          </div>
          <span className="font-medium text-text-light dark:text-text-dark">{t('dashboard:employee.timeOff')}</span>
        </button>
        <button
          onClick={() => navigate('/expenses')}
          className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
        >
          <div className="p-2 bg-accent-green/10 text-accent-green rounded-lg group-hover:bg-accent-green group-hover:text-white transition-colors">
            <DollarSign size={20} />
          </div>
          <span className="font-medium text-text-light dark:text-text-dark">{t('common:nav.expenses')}</span>
        </button>
        <button
          onClick={() => navigate('/surveys')}
          className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
        >
          <div className="p-2 bg-accent-orange/10 text-accent-orange rounded-lg group-hover:bg-accent-orange group-hover:text-white transition-colors">
            <MessageSquare size={20} />
          </div>
          <span className="font-medium text-text-light dark:text-text-dark">{t('dashboard:employee.surveys')}</span>
        </button>
        <button
          onClick={() => navigate('/payroll')}
          className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
        >
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-500 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
            <Wallet size={20} />
          </div>
          <span className="font-medium text-text-light dark:text-text-dark">{t('common:nav.payroll')}</span>
        </button>
      </div>
  );
};
