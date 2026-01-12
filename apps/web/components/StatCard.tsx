import React from 'react';
import { StatCardProps } from '../types';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const StatCard: React.FC<StatCardProps> = ({ title, value, trend, icon, color }) => {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-accent-green/10 text-accent-green',
    orange: 'bg-accent-orange/10 text-accent-orange',
    red: 'bg-accent-red/10 text-accent-red',
    teal: 'bg-accent-teal/10 text-accent-teal',
  };

  return (
    <div className="flex flex-col justify-between rounded-xl p-6 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-sm transition-transform hover:scale-[1.01]">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <p className="text-text-muted-light dark:text-text-muted-dark font-medium text-sm">{title}</p>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-text-light dark:text-text-dark tracking-tight text-3xl font-bold">{value}</p>
        {trend !== undefined && (
          <div className={`flex items-center text-sm font-semibold ${trend >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {trend >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            <span className="ml-1">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};