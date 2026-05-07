import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, RotateCw, PartyPopper, Clock, CheckCheck } from 'lucide-react';
import { useHolidays } from '../hooks/queries';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { PublicHoliday } from '../types';

const MONTH_COLORS = [
  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300',
  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
];

const parseDate = (dateStr: string) => new Date(dateStr.slice(0, 10) + 'T00:00:00');

const formatShort = (dateStr: string) =>
  parseDate(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const formatFull = (dateStr: string) =>
  parseDate(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

const getDaysUntil = (dateStr: string): number => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = parseDate(dateStr);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

const getDuration = (h: PublicHoliday): number => {
  if (!h.endDate) return 1;
  const start = parseDate(h.date);
  const end = parseDate(h.endDate);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
};

function HolidayCard({ h, isNext }: { h: PublicHoliday; isNext: boolean }) {
  const daysUntil = getDaysUntil(h.date);
  const isPast = daysUntil < 0;
  const isToday = daysUntil === 0;
  const duration = getDuration(h);
  const month = parseDate(h.date).getMonth();
  const monthColor = MONTH_COLORS[month];
  const day = parseDate(h.date).getDate();

  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
      isToday
        ? 'border-primary bg-primary/5 dark:bg-primary/10'
        : isNext
        ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10'
        : isPast
        ? 'border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-gray-800/20 opacity-60'
        : 'border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:bg-gray-50 dark:hover:bg-gray-800/30'
    }`}>
      {/* Date badge */}
      <div className={`shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold leading-none ${monthColor}`}>
        <span className="text-[10px] font-semibold uppercase opacity-70">
          {parseDate(h.date).toLocaleDateString('en-US', { month: 'short' })}
        </span>
        <span className="text-lg">{day}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`font-semibold text-sm ${isPast ? 'text-text-muted-light dark:text-text-muted-dark' : 'text-text-light dark:text-text-dark'}`}>
            {h.name}
          </p>
          {isToday && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary text-white uppercase tracking-wide">Today</span>
          )}
          {isNext && !isToday && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-500 text-white uppercase tracking-wide">Next</span>
          )}
          {h.isRecurring && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              <RotateCw size={9} /> Annual
            </span>
          )}
        </div>
        <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">
          {h.endDate ? `${formatShort(h.date)} – ${formatShort(h.endDate)} · ${duration} days` : formatFull(h.date)}
        </p>
      </div>

      {/* Days counter */}
      <div className="shrink-0 text-right">
        {isToday ? (
          <span className="text-xs font-semibold text-primary">Today</span>
        ) : isPast ? (
          <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{Math.abs(daysUntil)}d ago</span>
        ) : (
          <span className={`text-xs font-semibold ${isNext ? 'text-green-600 dark:text-green-400' : 'text-text-muted-light dark:text-text-muted-dark'}`}>
            in {daysUntil}d
          </span>
        )}
      </div>
    </div>
  );
}

export const Holidays: React.FC = () => {
  const { t } = useTranslation(['leave']);
  const { data: holidays = [], isLoading } = useHolidays();

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const sorted = useMemo(() =>
    [...holidays].sort((a, b) => a.date.localeCompare(b.date)),
  [holidays]);

  const { upcoming, past, nextHoliday, todayHoliday } = useMemo(() => {
    const up: PublicHoliday[] = [];
    const pa: PublicHoliday[] = [];
    let next: PublicHoliday | null = null;
    let todayH: PublicHoliday | null = null;
    for (const h of sorted) {
      const d = getDaysUntil(h.date);
      if (d < 0) { pa.push(h); }
      else { up.push(h); if (!next) next = h; if (d === 0) todayH = h; }
    }
    return { upcoming: up, past: pa, nextHoliday: next, todayHoliday: todayH };
  }, [sorted]);

  if (isLoading) return <LoadingSpinner />;

  const thisYear = today.getFullYear();
  const yearHolidays = sorted.filter(h => parseDate(h.date).getFullYear() === thisYear);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">
            {t('leave:holidays.title')}
          </h1>
          <p className="text-text-muted-light dark:text-text-muted-dark mt-1">
            {t('leave:holidays.subtitle')}
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <CalendarDays size={14} className="text-primary shrink-0" />
            <p className="text-xs text-text-muted-light dark:text-text-muted-dark truncate">Total {thisYear}</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-text-light dark:text-text-dark">{yearHolidays.length}</p>
          <p className="text-xs text-text-muted-light dark:text-text-muted-dark">holidays</p>
        </div>
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <PartyPopper size={14} className="text-green-500 shrink-0" />
            <p className="text-xs text-text-muted-light dark:text-text-muted-dark truncate">Next</p>
          </div>
          {nextHoliday ? (
            <>
              <p className="text-xs sm:text-sm font-bold text-text-light dark:text-text-dark truncate">{nextHoliday.name}</p>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium truncate">
                {getDaysUntil(nextHoliday.date) === 0 ? 'Today!' : `in ${getDaysUntil(nextHoliday.date)}d`}
              </p>
            </>
          ) : (
            <p className="text-xs text-text-muted-light dark:text-text-muted-dark">None</p>
          )}
        </div>
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCheck size={14} className="text-text-muted-light dark:text-text-muted-dark shrink-0" />
            <p className="text-xs text-text-muted-light dark:text-text-muted-dark truncate">Passed</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-text-light dark:text-text-dark">{past.length}</p>
          <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{upcoming.length} left</p>
        </div>
      </div>

      {holidays.length === 0 ? (
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col items-center justify-center py-20">
          <CalendarDays size={32} className="text-text-muted-light dark:text-text-muted-dark mb-3 opacity-40" />
          <p className="text-text-muted-light dark:text-text-muted-dark text-sm">{t('leave:holidays.noHolidays')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-primary" />
                <h2 className="text-sm font-semibold text-text-light dark:text-text-dark">Upcoming</h2>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-primary/10 text-primary">{upcoming.length}</span>
              </div>
              <div className="space-y-2">
                {upcoming.map(h => (
                  <HolidayCard key={h.id} h={h} isNext={nextHoliday?.id === h.id && !todayHoliday} />
                ))}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCheck size={14} className="text-text-muted-light dark:text-text-muted-dark" />
                <h2 className="text-sm font-semibold text-text-muted-light dark:text-text-muted-dark">Past Holidays</h2>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-gray-100 dark:bg-gray-800 text-text-muted-light dark:text-text-muted-dark">{past.length}</span>
              </div>
              <div className="space-y-2">
                {[...past].reverse().map(h => (
                  <HolidayCard key={h.id} h={h} isNext={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Holidays;
