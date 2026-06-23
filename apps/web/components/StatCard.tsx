import React from 'react';
import { StatCardProps } from '../types';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const StatCard: React.FC<StatCardProps> = React.memo(({ title, value, trend, icon, color, invertTrend = false, onClick }) => {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-accent-green/10 text-accent-green',
    orange: 'bg-accent-orange/10 text-accent-orange',
    red: 'bg-accent-red/10 text-accent-red',
    teal: 'bg-accent-teal/10 text-accent-teal',
  };

  return (
    <div
      className={`flex flex-col justify-between rounded-xl p-4 md:p-6 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-sm transition-transform hover:scale-[1.01]${onClick ? ' cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
        <div className={`p-2 md:p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <p className="text-text-muted-light dark:text-text-muted-dark font-medium text-xs md:text-sm leading-tight truncate min-w-0" title={typeof title === 'string' ? title : undefined}>{title}</p>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-text-light dark:text-text-dark tracking-tight text-2xl md:text-3xl font-bold">{value}</p>
        {trend !== undefined && trend !== 0 && (
          <div className={`flex items-center text-xs md:text-sm font-semibold ${
            (trend > 0) !== invertTrend ? 'text-accent-green' : 'text-accent-red'
          }`}>
            {trend > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            <span className="ml-1">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';