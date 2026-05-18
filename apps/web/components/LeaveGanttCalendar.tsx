import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, Calendar, CalendarDays, RotateCw } from 'lucide-react';
import type { LeaveRequest, Employee } from '../types';
import { useLeaveTypeConfig, useAdminAttendanceCalendar, useHolidays } from '../hooks/queries';
import { buildLeaveColorMap, getShortLabel, translateLeaveType } from '../lib/leaveTypeConfig';
import { Avatar } from './Avatar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LeaveCalendarProps {
  userLeaves: LeaveRequest[];
  teamLeaves: LeaveRequest[];
  allEmployees?: Employee[];
  isManager?: boolean;
  onLeaveClick?: (request: LeaveRequest) => void;
}

type ViewMode = 'week' | '2weeks' | 'month';

interface BarData {
  request: LeaveRequest;
  colStart: number;
  colEnd: number;
  isUser: boolean;
}

interface PersonRow {
  employeeId: string;
  name: string;
  bars: BarData[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DEFAULT_TYPE_COLOR = { bar: 'bg-gray-400', barDark: 'dark:bg-gray-500', text: 'text-white', legend: 'bg-gray-400 dark:bg-gray-500' };


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toLocalDateStr(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1]!;
  const d = new Date(raw);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Get Monday of the week containing `date` */
function getMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Generate array of dates for visible range */
function generateDateRange(start: Date, count: number): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    dates.push(addDays(start, i));
  }
  return dates;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const LeaveGanttCalendar: React.FC<LeaveCalendarProps> = ({
  userLeaves,
  teamLeaves,
  allEmployees,
  isManager = false,
  onLeaveClick,
}) => {
  const { t } = useTranslation(['leave', 'common']);
  const { data: leaveConfigs = [] } = useLeaveTypeConfig();

  const MONTH_NAMES = useMemo(() => [
    t('common:months.january'), t('common:months.february'), t('common:months.march'),
    t('common:months.april'), t('common:months.may'), t('common:months.june'),
    t('common:months.july'), t('common:months.august'), t('common:months.september'),
    t('common:months.october'), t('common:months.november'), t('common:months.december'),
  ], [t]);

  const SHORT_DAY_NAMES = useMemo(() => [
    t('common:weekdaysShort.sun'), t('common:weekdaysShort.mon'), t('common:weekdaysShort.tue'),
    t('common:weekdaysShort.wed'), t('common:weekdaysShort.thu'), t('common:weekdaysShort.fri'),
    t('common:weekdaysShort.sat'),
  ], [t]);
  const TYPE_COLORS = useMemo(() => {
    const colorMap = buildLeaveColorMap(leaveConfigs);
    const result: Record<string, { bar: string; barDark: string; text: string; legend: string }> = {};
    for (const [type, colors] of Object.entries(colorMap)) {
      result[type] = { bar: colors.bar, barDark: colors.barDark, text: 'text-white', legend: colors.legend };
    }
    return result;
  }, [leaveConfigs]);

  // Fetch public holidays
  const { data: holidays = [] } = useHolidays();
  const holidayDateSet = useMemo(() => {
    const set = new Set<string>();
    for (const h of holidays) {
      const start = h.date;
      const end = h.endDate || h.date;
      const cur = new Date(start + 'T00:00:00');
      const last = new Date(end + 'T00:00:00');
      while (cur <= last) {
        set.add(toDateKey(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }
    return set;
  }, [holidays]);

  // Build a lookup: dateKey -> holiday object
  const holidayMap = useMemo(() => {
    const map = new Map<string, typeof holidays[number]>();
    for (const h of holidays) {
      const cur = new Date(h.date + 'T00:00:00');
      const last = new Date((h.endDate || h.date) + 'T00:00:00');
      while (cur <= last) {
        map.set(toDateKey(cur), h);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [holidays]);
  // Tooltip state
  const [holidayTooltip, setHolidayTooltip] = useState<{ holiday: typeof holidays[number]; x: number; y: number } | null>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showHolidayTooltip = useCallback((holiday: typeof holidays[number], e: React.MouseEvent) => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    setHolidayTooltip({ holiday, x: e.clientX, y: e.clientY });
  }, []);

  const hideHolidayTooltip = useCallback(() => {
    tooltipTimeout.current = setTimeout(() => setHolidayTooltip(null), 80);
  }, []);

  useEffect(() => () => { if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current); }, []);

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [mobileSelectedDate, setMobileSelectedDate] = useState(() => toDateKey(new Date()));
  const dateStripRef = useRef<HTMLDivElement>(null);

  // Whether we show the availability view (all employees) or legacy leave-only view
  const showAvailability = !!allEmployees && allEmployees.length > 0;

  // Compute visible date range
  const { visibleDates, rangeLabel } = useMemo(() => {
    const today = new Date(anchor);
    let start: Date;
    let count: number;

    if (viewMode === 'month') {
      const y = today.getFullYear();
      const m = today.getMonth();
      start = new Date(y, m, 1);
      count = new Date(y, m + 1, 0).getDate();
    } else if (viewMode === '2weeks') {
      start = getMonday(today);
      count = 14;
    } else {
      start = getMonday(today);
      count = 7;
    }

    const allDates = generateDateRange(start, count);
    // Filter out weekends (Sat/Sun) – only show working days
    const dates = allDates.filter((d) => !isWeekend(d));
    const first = dates[0]!;
    const last = dates[dates.length - 1]!;

    let label: string;
    if (viewMode === 'month') {
      label = `${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`;
    } else {
      const fm = MONTH_NAMES[first.getMonth()]!.slice(0, 3);
      const lm = MONTH_NAMES[last.getMonth()]!.slice(0, 3);
      if (first.getMonth() === last.getMonth()) {
        label = `${fm} ${first.getDate()} – ${last.getDate()}, ${first.getFullYear()}`;
      } else {
        label = `${fm} ${first.getDate()} – ${lm} ${last.getDate()}, ${last.getFullYear()}`;
      }
    }

    return { visibleDates: dates, rangeLabel: label };
  }, [anchor, viewMode]);

  const todayKey = toDateKey(new Date());
  const firstDateKey = toDateKey(visibleDates[0]!);
  const lastDateKey = toDateKey(visibleDates[visibleDates.length - 1]!);

  // Fetch attendance records for the visible date range (only in availability mode)
  const { data: attendanceCalendarData } = useAdminAttendanceCalendar(
    firstDateKey,
    lastDateKey,
    showAvailability
  );

  // Build attendance map: date -> Set<employeeId> who checked in
  const attendanceByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (!attendanceCalendarData) return map;

    for (const record of attendanceCalendarData) {
      const dateKey = toLocalDateStr(record.date);
      if (!map.has(dateKey)) map.set(dateKey, new Set());
      map.get(dateKey)!.add(record.employeeId);
    }
    return map;
  }, [attendanceCalendarData]);

  // Compute attendance count per day (only in availability mode)
  const attendancePerDay = useMemo(() => {
    if (!showAvailability) return [];
    const activeEmployees = allEmployees!.filter(e => e.status !== 'Terminated');
    const total = activeEmployees.length;

    return visibleDates.map((date) => {
      const dateKey = toDateKey(date);
      const checkedInSet = attendanceByDate.get(dateKey);
      const present = checkedInSet ? checkedInSet.size : 0;
      return { total, present };
    });
  }, [showAvailability, allEmployees, visibleDates, attendanceByDate]);

  // Navigation handlers
  const handlePrev = () => {
    setAnchor((prev) => {
      if (viewMode === 'month') return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      if (viewMode === '2weeks') return addDays(prev, -14);
      return addDays(prev, -7);
    });
  };

  const handleNext = () => {
    setAnchor((prev) => {
      if (viewMode === 'month') return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      if (viewMode === '2weeks') return addDays(prev, 14);
      return addDays(prev, 7);
    });
  };

  const handleToday = () => setAnchor(new Date());

  // Build person rows from leaves
  const personRows: PersonRow[] = useMemo(() => {
    const allLeaves: { leave: LeaveRequest; isUser: boolean }[] = [];

    for (const leave of userLeaves) {
      if (leave.status !== 'Approved' && leave.status !== 'Pending') continue;
      if (!leave.startDate || !leave.endDate) continue;
      allLeaves.push({ leave, isUser: true });
    }

    for (const leave of teamLeaves) {
      if (isManager) {
        if (leave.status !== 'Approved' && leave.status !== 'Pending') continue;
      } else {
        if (leave.status !== 'Approved') continue;
      }
      if (!leave.startDate || !leave.endDate) continue;
      allLeaves.push({ leave, isUser: false });
    }

    // Group by employeeId
    const groupMap = new Map<string, PersonRow>();

    // In availability mode, seed rows for ALL active employees
    if (showAvailability) {
      for (const emp of allEmployees!) {
        if (emp.status === 'Terminated') continue;
        groupMap.set(emp.id, {
          employeeId: emp.id,
          name: emp.name,
          bars: [],
        });
      }
    }

    for (const { leave, isUser } of allLeaves) {
      const leaveStart = toLocalDateStr(leave.startDate);
      const leaveEnd = toLocalDateStr(leave.endDate);

      // Check if leave overlaps with visible range
      if (leaveEnd < firstDateKey || leaveStart > lastDateKey) continue;

      // Clamp to visible range
      const clampedStart = leaveStart < firstDateKey ? firstDateKey : leaveStart;
      const clampedEnd = leaveEnd > lastDateKey ? lastDateKey : leaveEnd;

      // Find column indices (snap to nearest weekday since weekends are filtered out)
      let startIdx = visibleDates.findIndex((d) => toDateKey(d) >= clampedStart);
      let endIdx = -1;
      for (let ei = visibleDates.length - 1; ei >= 0; ei--) {
        if (toDateKey(visibleDates[ei]!) <= clampedEnd) { endIdx = ei; break; }
      }
      if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) continue;

      // CSS Grid: col 1 = name, col 2+ = dates (1-based)
      const colStart = startIdx + 2;
      const colEnd = endIdx + 3; // grid-column-end is exclusive

      const empId = leave.employeeId;
      if (!groupMap.has(empId)) {
        groupMap.set(empId, {
          employeeId: empId,
          name: leave.employeeName || 'Unknown',
          bars: [],
        });
      }
      groupMap.get(empId)!.bars.push({ request: leave, colStart, colEnd, isUser });
    }

    // Sort: user first, then alphabetical
    const rows = Array.from(groupMap.values());
    rows.sort((a, b) => {
      const aIsUser = a.bars.some((bar) => bar.isUser);
      const bIsUser = b.bars.some((bar) => bar.isUser);
      if (aIsUser && !bIsUser) return -1;
      if (!aIsUser && bIsUser) return 1;
      return a.name.localeCompare(b.name);
    });

    return rows;
  }, [userLeaves, teamLeaves, isManager, allEmployees, showAvailability, visibleDates, firstDateKey, lastDateKey]);

  // ---- Mobile: horizontal date strip (3 days back, today, 4 days forward) ----
  const mobileDates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 8 }, (_, i) => addDays(today, i - 3));
  }, []);

  // Auto-scroll date strip to center "today" on mount
  useEffect(() => {
    if (dateStripRef.current) {
      const todayEl = dateStripRef.current.querySelector('[data-today="true"]');
      if (todayEl) {
        todayEl.scrollIntoView({ inline: 'center', block: 'nearest' });
      }
    }
  }, []);

  // ---- Mobile: employee list for selected date ----
  const mobileEmployeeList = useMemo(() => {
    if (!showAvailability || !allEmployees) return [];

    const activeEmployees = allEmployees.filter(e => e.status !== 'Terminated');
    const checkedInSet = attendanceByDate.get(mobileSelectedDate);
    const isFuture = mobileSelectedDate > todayKey;

    // Build leave map for selected date
    const allLeaves = [...userLeaves, ...teamLeaves];
    const onLeaveMap = new Map<string, LeaveRequest>();
    for (const leave of allLeaves) {
      if (leave.status !== 'Approved' && leave.status !== 'Pending') continue;
      if (!leave.startDate || !leave.endDate) continue;
      const start = toLocalDateStr(leave.startDate);
      const end = toLocalDateStr(leave.endDate);
      if (mobileSelectedDate >= start && mobileSelectedDate <= end) {
        onLeaveMap.set(leave.employeeId, leave);
      }
    }

    type MobileEmployee = {
      id: string;
      name: string;
      avatar?: string;
      department?: string;
      status: 'leave' | 'present' | 'absent' | 'pending' | 'future';
      leaveType?: string;
      leaveRequest?: LeaveRequest;
    };

    const list: MobileEmployee[] = activeEmployees.map((emp) => {
      const leave = onLeaveMap.get(emp.id);
      if (leave) {
        return {
          id: emp.id,
          name: emp.name,
          avatar: emp.avatar,
          department: emp.department,
          status: leave.status === 'Pending' ? 'pending' as const : 'leave' as const,
          leaveType: leave.type,
          leaveRequest: leave,
        };
      }
      if (isFuture) {
        return { id: emp.id, name: emp.name, avatar: emp.avatar, department: emp.department, status: 'future' as const };
      }
      const isIn = checkedInSet?.has(emp.id);
      return {
        id: emp.id,
        name: emp.name,
        avatar: emp.avatar,
        department: emp.department,
        status: isIn ? 'present' as const : 'absent' as const,
      };
    });

    // Sort: leave/pending/absent first (exceptions), then present, then future
    const order: Record<string, number> = { leave: 0, pending: 1, absent: 2, present: 3, future: 4 };
    list.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));

    return list;
  }, [showAvailability, allEmployees, mobileSelectedDate, attendanceByDate, todayKey, userLeaves, teamLeaves]);

  const dayCount = visibleDates.length;
  const ROW_HEIGHT = 44;
  // +1 for the attendance summary row when in availability mode
  const summaryRowIdx = showAvailability ? 2 : -1; // row 2 = summary (after header)
  const personRowOffset = showAvailability ? 3 : 2; // person rows start after summary

  return (
    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-4 md:p-6 flex flex-col">
      {/* Header: title + view toggle (desktop) */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold text-text-light dark:text-text-dark">
          {showAvailability ? t('leave:calendar.teamAvailability') : t('leave:calendar.teamCalendar')}
        </h2>
        <div className="hidden md:flex items-center gap-1 bg-background-light dark:bg-background-dark rounded-lg p-0.5">
          {(['week', '2weeks', 'month'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === mode
                  ? 'bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark shadow-sm'
                  : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark'
              }`}
            >
              {mode === 'week' ? t('leave:calendar.week') : mode === '2weeks' ? t('leave:calendar.twoWeeks') : t('leave:calendar.month')}
            </button>
          ))}
        </div>
      </div>

      {/* ================================================================ */}
      {/* MOBILE VIEW — date strip + employee list                        */}
      {/* ================================================================ */}
      <div className="md:hidden">
        {/* Horizontal Date Strip */}
        <div className="relative -mx-4">
          <div className="pointer-events-none absolute left-0 top-0 bottom-3 w-8 z-10 bg-gradient-to-r from-card-light dark:from-card-dark to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-3 w-8 z-10 bg-gradient-to-l from-card-light dark:from-card-dark to-transparent" />
        <div
          ref={dateStripRef}
          className="flex gap-1.5 overflow-x-auto pb-3 px-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {mobileDates.map((date) => {
            const key = toDateKey(date);
            const isToday = key === todayKey;
            const isSelected = key === mobileSelectedDate;
            const isWkend = isWeekend(date);
            return (
              <button
                key={key}
                data-today={isToday ? 'true' : undefined}
                onClick={() => !isWkend && setMobileSelectedDate(key)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-12 h-16 rounded-xl transition-all ${
                  isWkend
                    ? 'opacity-30 cursor-default'
                    : isSelected
                      ? 'bg-primary text-white shadow-md scale-105'
                      : isToday
                        ? 'bg-primary/10 text-primary border border-primary/30'
                        : 'bg-background-light dark:bg-background-dark text-text-muted-light dark:text-text-muted-dark'
                }`}
              >
                <span className="text-[10px] font-medium uppercase">
                  {SHORT_DAY_NAMES[date.getDay()]}
                </span>
                <span className={`text-lg font-bold leading-tight ${isSelected ? '' : isToday ? 'text-primary' : 'text-text-light dark:text-text-dark'}`}>
                  {date.getDate()}
                </span>
                {isToday && !isSelected && (
                  <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
        </div>

        {/* Employee List */}
        <div className="space-y-2 mt-2">
          {mobileEmployeeList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-text-muted-light dark:text-text-muted-dark">
              <Calendar size={32} className="mb-2 opacity-30" />
              <p className="text-sm">{t('leave:calendar.noDataForDay')}</p>
            </div>
          ) : (
            mobileEmployeeList.map((emp) => {
              const statusConfig = {
                leave: { icon: XCircle, color: 'text-accent-red', bg: 'bg-accent-red/10', label: emp.leaveType ? translateLeaveType(emp.leaveType) : t('leave:calendar.onLeave') },
                pending: { icon: Clock, color: 'text-accent-orange', bg: 'bg-accent-orange/10', label: t('leave:calendar.pending') },
                absent: { icon: XCircle, color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800', label: t('leave:calendar.notIn') },
                present: { icon: CheckCircle2, color: 'text-accent-green', bg: 'bg-accent-green/10', label: t('leave:calendar.present') },
                future: { icon: Clock, color: 'text-gray-300 dark:text-gray-600', bg: 'bg-gray-50 dark:bg-gray-800/50', label: '-' },
              };
              const cfg = statusConfig[emp.status];
              const Icon = cfg.icon;
              const canClick = (emp.status === 'leave' || emp.status === 'pending') && !!emp.leaveRequest && !!onLeaveClick;

              return (
                <div
                  key={emp.id}
                  onClick={canClick ? () => onLeaveClick!(emp.leaveRequest!) : undefined}
                  className={`flex items-center gap-3 p-3 rounded-xl border border-border-light dark:border-border-dark transition-colors ${
                    emp.status === 'leave' ? 'bg-accent-red/5 border-accent-red/20' :
                    emp.status === 'pending' ? 'bg-accent-orange/5 border-accent-orange/20' :
                    'bg-card-light dark:bg-card-dark'
                  } ${canClick ? 'cursor-pointer active:bg-background-light dark:active:bg-background-dark' : ''}`}
                >
                  <Avatar src={emp.avatar} name={emp.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-light dark:text-text-dark truncate">{emp.name}</p>
                    {emp.department && (
                      <p className="text-xs text-text-muted-light dark:text-text-muted-dark truncate">{emp.department}</p>
                    )}
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg min-h-[36px] ${cfg.bg}`}>
                    <Icon size={16} className={cfg.color} />
                    <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* DESKTOP VIEW — Navigation + Gantt chart                          */}
      {/* ================================================================ */}

      {/* Navigation (desktop only) */}
      <div className="hidden md:flex items-center justify-between mb-4">
        <button
          onClick={handlePrev}
          className="p-1.5 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors"
        >
          <ChevronLeft size={18} className="text-text-light dark:text-text-dark" />
        </button>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm text-text-light dark:text-text-dark">
            {rangeLabel}
          </span>
          <button
            onClick={handleToday}
            className="px-2.5 py-1 text-xs font-medium rounded-md border border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors"
          >
            {t('leave:calendar.today')}
          </button>
        </div>
        <button
          onClick={handleNext}
          className="p-1.5 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors"
        >
          <ChevronRight size={18} className="text-text-light dark:text-text-dark" />
        </button>
      </div>

      {/* Gantt chart (desktop only) */}
      <div className="hidden md:block overflow-x-auto -mx-6 px-6">
        <div
          className="min-w-[600px]"
          style={{
            display: 'grid',
            gridTemplateColumns: `120px repeat(${dayCount}, minmax(28px, 1fr))`,
            gridTemplateRows: `auto ${showAvailability ? `${ROW_HEIGHT}px ` : ''}${personRows.length > 0 ? `repeat(${personRows.length}, ${ROW_HEIGHT}px)` : 'auto'}`,
          }}
        >
          {/* ---- Header row (gridRow 1): empty name cell + day columns ---- */}
          <div
            className="sticky left-0 z-10 bg-card-light dark:bg-card-dark border-b border-border-light dark:border-border-dark"
            style={{ gridRow: 1, gridColumn: 1 }}
          />
          {visibleDates.map((date, i) => {
            const key = toDateKey(date);
            const isToday = key === todayKey;
            const isHoliday = holidayDateSet.has(key);
            const holiday = holidayMap.get(key);
            return (
              <div
                key={key}
                className={`text-center py-1.5 text-[10px] leading-tight border-b border-border-light dark:border-border-dark select-none ${
                  isHoliday ? 'bg-red-50 dark:bg-red-900/20 cursor-help' : isToday ? 'bg-primary/5 dark:bg-primary/10' : ''
                }`}
                style={{ gridRow: 1, gridColumn: i + 2 }}
                onMouseEnter={holiday ? (e) => showHolidayTooltip(holiday, e) : undefined}
                onMouseLeave={holiday ? hideHolidayTooltip : undefined}
              >
                <div className={`font-medium ${
                  isHoliday ? 'text-red-500 dark:text-red-400' : isToday ? 'text-primary' : 'text-text-muted-light dark:text-text-muted-dark'
                }`}>
                  {date.getDate()}
                </div>
                <div className={`${
                  isHoliday ? 'text-red-400 dark:text-red-500' : isToday ? 'text-primary' : 'text-text-muted-light dark:text-text-muted-dark'
                } opacity-70`}>
                  {SHORT_DAY_NAMES[date.getDay()]}
                </div>
              </div>
            );
          })}

          {/* ---- Attendance summary row (gridRow 2) ---- */}
          {showAvailability && (
            <>
              <div
                className="sticky left-0 z-10 bg-card-light dark:bg-card-dark flex items-center pr-2 border-b-2 border-border-light dark:border-border-dark"
                style={{ gridRow: summaryRowIdx, gridColumn: 1 }}
              >
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wide truncate">
                  {t('leave:calendar.checkedIn')}
                </span>
              </div>
              {visibleDates.map((date, i) => {
                const key = toDateKey(date);
                const isToday = key === todayKey;
                const isHoliday = holidayDateSet.has(key);
                const holiday = holidayMap.get(key);
                const stats = attendancePerDay[i];
                const present = stats?.present ?? 0;
                const total = stats?.total ?? 0;
                const ratio = total > 0 ? present / total : 0;
                let countColor = 'text-emerald-600 dark:text-emerald-400';
                if (ratio < 0.75) countColor = 'text-amber-600 dark:text-amber-400';
                if (ratio < 0.5) countColor = 'text-red-600 dark:text-red-400';
                if (key > todayKey || isHoliday) {
                  countColor = 'text-text-muted-light dark:text-text-muted-dark';
                }

                return (
                  <div
                    key={`summary-${key}`}
                    className={`flex flex-col items-center justify-center border-b-2 border-border-light dark:border-border-dark ${
                      isHoliday ? 'bg-red-50 dark:bg-red-900/20 cursor-help' : isToday ? 'bg-primary/5 dark:bg-primary/10' : ''
                    }`}
                    style={{ gridRow: summaryRowIdx, gridColumn: i + 2 }}
                    onMouseEnter={holiday ? (e) => showHolidayTooltip(holiday, e) : undefined}
                    onMouseLeave={holiday ? hideHolidayTooltip : undefined}
                  >
                    <span className={`text-xs font-bold ${countColor}`}>
                      {isHoliday ? '-' : key > todayKey ? '-' : present}
                    </span>
                    <span className="text-[8px] text-text-muted-light dark:text-text-muted-dark leading-none">
                      /{total}
                    </span>
                  </div>
                );
              })}
            </>
          )}

          {/* ---- Empty state ---- */}
          {personRows.length === 0 && (
            <div
              className="text-center py-10 text-sm text-text-muted-light dark:text-text-muted-dark"
              style={{ gridRow: personRowOffset, gridColumn: `1 / ${dayCount + 2}` }}
            >
              {showAvailability ? t('leave:calendar.allAvailable') : t('leave:calendar.noRequests')}
            </div>
          )}

          {/* ---- Person rows ---- */}
          {personRows.map((person, pIdx) => {
            const gridRow = pIdx + personRowOffset;
            const rowIsUser = person.bars.some((b) => b.isUser);

            return (
              <React.Fragment key={person.employeeId}>
                {/* Name cell */}
                <div
                  className="sticky left-0 z-10 bg-card-light dark:bg-card-dark flex items-center pr-2 border-b border-border-light dark:border-border-dark"
                  style={{ gridRow, gridColumn: 1 }}
                >
                  <span
                    className="text-xs font-medium truncate text-text-light dark:text-text-dark"
                    title={person.name}
                  >
                    {rowIsUser ? t('leave:calendar.you') : person.name}
                  </span>
                </div>

                {/* Day cells with attendance indicators */}
                {visibleDates.map((date, i) => {
                  const dateKey = toDateKey(date);
                  const isToday = dateKey === todayKey;
                  const isFuture = dateKey > todayKey;
                  const isHoliday = holidayDateSet.has(dateKey);
                  const holidayForCell = holidayMap.get(dateKey);
                  const checkedIn = showAvailability && attendanceByDate.get(dateKey)?.has(person.employeeId);

                  return (
                    <div
                      key={`${person.employeeId}-${dateKey}`}
                      className={`flex items-center justify-center border-b border-border-light dark:border-border-dark ${isToday ? 'border-l-2 border-l-primary/40' : ''}
                      ${isHoliday ? 'bg-red-50 dark:bg-red-900/20 cursor-help' : showAvailability && checkedIn ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}
                      style={{ gridRow, gridColumn: i + 2 }}
                      onMouseEnter={holidayForCell ? (e) => showHolidayTooltip(holidayForCell, e) : undefined}
                      onMouseLeave={holidayForCell ? hideHolidayTooltip : undefined}
                    >
                      {showAvailability && !isFuture && !isHoliday && (
                        checkedIn ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                        )
                      )}
                    </div>
                  );
                })}

                {/* Leave bars — same gridRow, higher z-index -> overlaps bg cells */}
                {person.bars.map((bar) => {
                  const isPending = bar.request.status === 'Pending';
                  const isBarUser = bar.isUser;
                  const canClick = isBarUser
                    ? !!onLeaveClick
                    : isManager && !!onLeaveClick;

                  // Colors & label — always show leave type color
                  const colors = TYPE_COLORS[bar.request.type] || DEFAULT_TYPE_COLOR;
                  const shortType = getShortLabel(bar.request.type);
                  const label = isManager
                    ? `${person.name} - ${shortType}`
                    : isBarUser ? shortType : `${person.name} - ${shortType}`;

                  return (
                    <div
                      key={bar.request.id}
                      className={`
                        flex items-center px-1.5 mx-0.5 rounded-md text-[10px] font-medium leading-none
                        whitespace-nowrap overflow-hidden
                        ${colors.bar} ${colors.barDark} ${colors.text}
                        ${isPending ? 'opacity-60 border border-dashed border-white/50' : ''}
                        ${canClick ? 'cursor-pointer hover:brightness-110 hover:shadow-md transition-all' : ''}
                      `}
                      style={{
                        gridRow,
                        gridColumn: `${bar.colStart} / ${bar.colEnd}`,
                        zIndex: 5,
                        height: 26,
                        alignSelf: 'center',
                      }}
                      title={`${bar.request.employeeName} — ${translateLeaveType(bar.request.type)} (${bar.request.status})`}
                      onClick={canClick ? () => onLeaveClick!(bar.request) : undefined}
                    >
                      <span className="truncate">{label}</span>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Legend (desktop only) */}
      <div className="hidden md:flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-border-light dark:border-border-dark">
        {/* Checked-in indicator (availability mode) */}
        {showAvailability && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('leave:calendar.checkedIn')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
              <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('leave:calendar.notIn')}</span>
            </div>
          </>
        )}

        {Object.entries(TYPE_COLORS).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`w-3 h-2 rounded-sm ${colors.legend}`} />
            <span className="text-xs text-text-muted-light dark:text-text-muted-dark">
              {getShortLabel(type)}
            </span>
          </div>
        ))}

        {/* Public holiday indicator */}
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700" />
          <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('leave:calendar.publicHoliday')}</span>
        </div>

        {/* Pending indicator */}
        {isManager && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-gray-300 dark:bg-gray-500 opacity-60 border border-dashed border-gray-500 dark:border-gray-300" />
            <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('common:status.pending')}</span>
          </div>
        )}

      </div>

      {/* Holiday tooltip portal */}
      {holidayTooltip && createPortal(
        (() => {
          const h = holidayTooltip.holiday;
          const TW = 248;
          const TH = 110;
          const left = Math.max(8, Math.min(holidayTooltip.x - TW / 2, window.innerWidth - TW - 8));
          const showBelow = holidayTooltip.y < TH + 30;
          const top = showBelow ? holidayTooltip.y + 20 : holidayTooltip.y - TH - 10;
          const startDate = new Date(h.date + 'T00:00:00');
          const endDate = h.endDate ? new Date(h.endDate + 'T00:00:00') : null;
          const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          const dateDisplay = endDate ? `${fmt(startDate)} – ${fmt(endDate)}` : startDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
          const todayStr = toDateKey(new Date());
          const isToday = todayStr >= h.date && todayStr <= (h.endDate || h.date);
          return (
            <div
              style={{ position: 'fixed', left, top, width: TW, zIndex: 9999, pointerEvents: 'none' }}
              className="rounded-xl bg-white dark:bg-gray-800 shadow-2xl border border-red-100 dark:border-red-900/40 overflow-hidden"
            >
              <div className="h-1 bg-gradient-to-r from-red-400 to-rose-500" />
              <div className="p-3">
                <div className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center mt-0.5">
                    <CalendarDays size={16} className="text-red-500 dark:text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">{h.name}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{dateDisplay}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {h.isRecurring && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-[10px] font-medium rounded-full">
                          <RotateCw size={9} />
                          Annual
                        </span>
                      )}
                      {endDate && (
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 text-[10px] font-medium rounded-full">
                          Multi-day
                        </span>
                      )}
                      {isToday && (
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 text-[10px] font-medium rounded-full">
                          Today
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
};
