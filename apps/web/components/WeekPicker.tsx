import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WeekPickerProps {
  /** Monday of the selected week */
  weekStart: Date;
  onChange: (monday: Date) => void;
  className?: string;
}

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatRange(monday: Date, lang: string): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  if (lang === 'th') {
    // "11 พ.ค. – 17 พ.ค. 2569"
    const s = monday.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const e = sunday.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${s} – ${e}`;
  }
  // "11 May – 17 May 2026"
  const s = monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const e = sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${s} – ${e}`;
}

export const WeekPicker: React.FC<WeekPickerProps> = ({ weekStart, onChange, className = '' }) => {
  const { t, i18n } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => new Date(weekStart.getFullYear(), weekStart.getMonth(), 1));
  const [hoveredMonday, setHoveredMonday] = useState<Date | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Sync view month when weekStart changes externally
  useEffect(() => {
    setViewMonth(new Date(weekStart.getFullYear(), weekStart.getMonth(), 1));
  }, [weekStart]);

  const open = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const calW = 300;
    let left = rect.left + window.scrollX;
    if (left + calW > window.innerWidth - 12) left = rect.right + window.scrollX - calW;
    if (left < 12) left = 12;
    const calH = 320;
    let top = rect.bottom + window.scrollY + 6;
    if (rect.bottom + calH > window.innerHeight - 12) top = rect.top + window.scrollY - calH - 6;
    setMenuPos({ top, left });
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) { setMenuPos(null); return; }
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !calendarRef.current?.contains(t)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Build calendar grid for viewMonth
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Start grid on Monday
  const startOffset = (firstDay === 0 ? 6 : firstDay - 1);

  // Fill cells: null = empty, Date = day
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const handleDayClick = (date: Date) => {
    const monday = getMondayOf(date);
    onChange(monday);
    setIsOpen(false);
    setHoveredMonday(null);
  };

  const handleDayHover = (date: Date | null) => {
    setHoveredMonday(date ? getMondayOf(date) : null);
  };

  const isInWeek = (date: Date, monday: Date): boolean => {
    const d = date.getTime();
    const start = monday.getTime();
    const end = start + 6 * 86400000;
    return d >= start && d <= end;
  };

  const selectedMonday = getMondayOf(weekStart);
  const activeMonday = hoveredMonday ?? selectedMonday;

  const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {/* Prev week */}
      <button
        onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); onChange(d); }}
        className="p-1.5 rounded-lg text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors"
      >
        <ChevronLeft size={15} />
      </button>

      {/* Clickable date range label */}
      <div
        ref={triggerRef}
        onClick={open}
        className="px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark cursor-pointer select-none hover:border-primary/40 transition-colors shadow-sm"
      >
        <span className="text-sm font-medium text-text-light dark:text-text-dark whitespace-nowrap tabular-nums">
          {formatRange(weekStart, i18n.language)}
        </span>
      </div>

      {/* Next week */}
      <button
        onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); onChange(d); }}
        className="p-1.5 rounded-lg text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors"
      >
        <ChevronRight size={15} />
      </button>

      {/* Calendar popup */}
      {isOpen && menuPos && createPortal(
        <div
          ref={calendarRef}
          style={{ position: 'absolute', top: menuPos.top, left: menuPos.left, zIndex: 99999, width: 300 }}
          className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-xl p-4 animate-in fade-in slide-in-from-top-2 duration-150"
          onMouseLeave={() => setHoveredMonday(null)}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              className="p-1 rounded hover:bg-background-light dark:hover:bg-background-dark transition-colors"
            >
              <ChevronLeft size={16} className="text-text-light dark:text-text-dark" />
            </button>
            <span className="text-sm font-semibold text-text-light dark:text-text-dark">
              {t(`months.${MONTH_KEYS[month]}`)} {year}
            </span>
            <button
              onClick={() => setViewMonth(new Date(year, month + 1, 1))}
              className="p-1 rounded hover:bg-background-light dark:hover:bg-background-dark transition-colors"
            >
              <ChevronRight size={16} className="text-text-light dark:text-text-dark" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-text-muted-light dark:text-text-muted-dark py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {cells.map((date, i) => {
              if (!date) return <div key={i} />;
              const inActive = isInWeek(date, activeMonday);
              const inSelected = isInWeek(date, selectedMonday);
              const isFirst = isSameDay(date, activeMonday);
              const isLast = (() => { const sun = new Date(activeMonday); sun.setDate(sun.getDate() + 6); return isSameDay(date, sun); })();
              const today = isSameDay(date, new Date());

              return (
                <div
                  key={i}
                  onClick={() => handleDayClick(date)}
                  onMouseEnter={() => handleDayHover(date)}
                  className={`
                    relative py-1.5 text-center text-sm cursor-pointer transition-colors
                    ${inActive ? 'bg-primary/10 text-primary font-medium' : 'text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark'}
                    ${inSelected && !hoveredMonday ? 'bg-primary/15 text-primary font-semibold' : ''}
                    ${isFirst ? 'rounded-l-full' : ''}
                    ${isLast ? 'rounded-r-full' : ''}
                    ${today && !inActive ? 'font-bold underline decoration-dotted' : ''}
                  `}
                >
                  {date.getDate()}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-border-light dark:border-border-dark flex justify-between items-center">
            <button
              onClick={() => { onChange(getMondayOf(new Date())); setIsOpen(false); }}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t('time.thisWeek')}
            </button>
            <span className="text-xs text-text-muted-light dark:text-text-muted-dark">
              {formatRange(weekStart, i18n.language)}
            </span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
