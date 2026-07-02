import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTeamCalendar } from '../hooks/queries';
import { useAuth } from '../contexts/AuthContext';
import { useModalA11y } from '../hooks/useModalA11y';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  event_type: 'leave' | 'wfh' | 'ot' | 'holiday';
  employee_id: string | null;
  employee_name: string;
  avatar: string | null;
  department: string | null;
  start_date: string;
  end_date: string;
  sub_type: string;
  status: string;
  reason: string | null;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const EVENT_COLORS: Record<CalendarEvent['event_type'], { bg: string; text: string; dot: string }> = {
  leave:   { bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-800 dark:text-red-300',    dot: 'bg-red-500'    },
  wfh:     { bg: 'bg-blue-100 dark:bg-blue-900/30',  text: 'text-blue-800 dark:text-blue-300',  dot: 'bg-blue-500'   },
  ot:      { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300', dot: 'bg-orange-500' },
  holiday: { bg: 'bg-gray-100 dark:bg-gray-700',     text: 'text-gray-700 dark:text-gray-300',  dot: 'bg-gray-400'   },
};


// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {return raw;}
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1]! : raw;
}

function expandRange(start: string | undefined, end: string | undefined): string[] {
  if (!start || !end) {return [];}
  const dates: string[] = [];
  const s = new Date(toDateStr(start) + 'T00:00:00');
  const e = new Date(toDateStr(end) + 'T00:00:00');
  while (s <= e) {
    dates.push(s.toISOString().slice(0, 10));
    s.setDate(s.getDate() + 1);
  }
  return dates;
}

// ─── Event Dot ────────────────────────────────────────────────────────────────

function EventPill({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const cfg = EVENT_COLORS[event.event_type];
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate font-medium ${cfg.bg} ${cfg.text} hover:opacity-80 transition-opacity`}
    >
      {event.event_type === 'holiday' ? event.employee_name : event.employee_name.split(' ')[0]}
    </button>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function EventModal({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const { t } = useTranslation(['leave', 'common']);
  const dialogRef = useModalA11y(true, onClose);
  const cfg = EVENT_COLORS[event.event_type];
  const isMultiDay = event.start_date !== event.end_date;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="teamcal-event-title"
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.text}`}>{t(`teamCalendar.eventTypes.${event.event_type}`)}</span>
            </div>
            <h3 id="teamcal-event-title" className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">
              {event.event_type === 'holiday' ? event.employee_name : event.employee_name}
            </h3>
          </div>
          <button onClick={onClose} aria-label={t('common:buttons.close')} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="space-y-2 text-sm">
          {event.department && (
            <div className="flex justify-between">
              <span className="text-text-muted-light dark:text-text-muted-dark">{t('teamCalendar.department')}</span>
              <span className="font-medium text-text-primary-light dark:text-text-primary-dark">{event.department}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-text-muted-light dark:text-text-muted-dark">{t('teamCalendar.date')}</span>
            <span className="font-medium text-text-primary-light dark:text-text-primary-dark">
              {isMultiDay
                ? `${new Date(event.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(event.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : new Date(event.start_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          {event.sub_type && event.event_type !== 'holiday' && (
            <div className="flex justify-between">
              <span className="text-text-muted-light dark:text-text-muted-dark">{t('teamCalendar.type')}</span>
              <span className="font-medium text-text-primary-light dark:text-text-primary-dark">{event.sub_type}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-text-muted-light dark:text-text-muted-dark">{t('teamCalendar.status')}</span>
            <span className="font-medium capitalize text-text-primary-light dark:text-text-primary-dark">{event.status}</span>
          </div>
          {event.reason && (
            <div>
              <span className="text-text-muted-light dark:text-text-muted-dark">{t('teamCalendar.reason')}</span>
              <p className="mt-1 text-text-primary-light dark:text-text-primary-dark bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">{event.reason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function TeamCalendar() {
  const { t } = useTranslation(['leave', 'common']);
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'HR_ADMIN' || user?.role === 'MANAGER';

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [department, setDepartment] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const { data, isLoading } = useTeamCalendar(monthStr, department || undefined);

  // Build a map: dateStr → events[]
  const dateEventMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    if (!data?.events) {return map;}
    for (const ev of data.events as CalendarEvent[]) {
      for (const d of expandRange(ev.start_date, ev.end_date)) {
        if (!map.has(d)) {map.set(d, []);}
        map.get(d)!.push(ev);
      }
    }
    return map;
  }, [data]);

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else {setMonth(m => m - 1);} };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else {setMonth(m => m + 1);} };

  // Build calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) {cells.push(null);}

  const todayStr = today.toISOString().slice(0, 10);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">{t('teamCalendar.title')}</h1>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-0.5">{t('teamCalendar.subtitle')}</p>
        </div>

        {/* Department filter */}
        {isAdminOrManager && data?.departments && data.departments.length > 0 && (
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">{t('teamCalendar.allDepartments')}</option>
            {data.departments.map((d: string) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>

      {/* Month navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="text-base font-semibold text-text-primary-light dark:text-text-primary-dark">
            {t(`common:months.${['january','february','march','april','may','june','july','august','september','october','november','december'][month]}`)} {year}
          </h2>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ChevronRight size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">
          {(['sun','mon','tue','wed','thu','fri','sat'] as const).map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-text-muted-light dark:text-text-muted-dark">{t(`common:weekdaysShort.${d}`)}</div>
          ))}
        </div>

        {/* Calendar grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="min-h-[90px] bg-gray-50/50 dark:bg-gray-800/30 border-b border-r border-gray-100 dark:border-gray-700/50" />;
              }
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const events = dateEventMap.get(dateStr) ?? [];
              const isToday = dateStr === todayStr;
              const isWeekend = new Date(dateStr + 'T00:00:00').getDay() % 6 === 0;

              return (
                <div
                  key={dateStr}
                  className={`min-h-[90px] p-1.5 border-b border-r border-gray-100 dark:border-gray-700/50 ${
                    isWeekend ? 'bg-gray-50/60 dark:bg-gray-800/40' : 'bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 ${
                    isToday
                      ? 'bg-primary text-white'
                      : 'text-text-primary-light dark:text-text-primary-dark'
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {events.slice(0, 3).map((ev) => (
                      <EventPill key={`${ev.id}-${dateStr}`} event={ev} onClick={() => setSelectedEvent(ev)} />
                    ))}
                    {events.length > 3 && (
                      <p className="text-[10px] text-text-muted-light dark:text-text-muted-dark pl-1">{t('teamCalendar.more', { count: events.length - 3 })}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {(Object.entries(EVENT_COLORS) as [CalendarEvent['event_type'], typeof EVENT_COLORS[keyof typeof EVENT_COLORS]][]).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1.5 text-sm text-text-muted-light dark:text-text-muted-dark">
            <span className={`w-3 h-3 rounded-sm ${cfg.dot}`} />
            {t(`teamCalendar.eventTypes.${type}`)}
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {selectedEvent && <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}

export default TeamCalendar;
