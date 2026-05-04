import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { LeaveRequest, PublicHoliday } from '../types';
import { useLeaveTypeConfig } from '../hooks/queries';
import { buildLeaveColorMap, getShortLabel, translateLeaveType } from '../lib/leaveTypeConfig';

interface LeaveCalendarProps {
  userLeaves: LeaveRequest[];
  teamLeaves: LeaveRequest[];
  isManager?: boolean;
  onLeaveClick?: (request: LeaveRequest) => void;
  holidays?: PublicHoliday[];
}

// MONTH_NAMES and DAY_NAMES are defined inside the component to access translations

const DEFAULT_COLOR = { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-200', dot: 'bg-gray-400 dark:bg-gray-500', badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };

interface LeaveEntry {
  name: string;
  type: string;
  isUser: boolean;
  request: LeaveRequest;
}

function toLocalDateStr(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  const d = new Date(raw);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function expandDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const startStr = toLocalDateStr(start);
  const endStr = toLocalDateStr(end);
  const d = new Date(startStr + 'T00:00:00');
  const last = new Date(endStr + 'T00:00:00');
  while (d <= last) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Build a map of date → leave entries with names */
function buildLeaveMap(leaves: LeaveRequest[], isUser: boolean, isManager: boolean): Map<string, LeaveEntry[]> {
  const map = new Map<string, LeaveEntry[]>();
  for (const leave of leaves) {
    if (isManager) {
      if (leave.status !== 'Approved' && leave.status !== 'Pending') continue;
    } else {
      if (leave.status !== 'Approved') continue;
    }
    if (!leave.startDate || !leave.endDate) continue;
    const entry: LeaveEntry = {
      name: leave.employeeName || 'Unknown',
      type: leave.type,
      isUser,
      request: leave,
    };
    for (const d of expandDateRange(leave.startDate, leave.endDate)) {
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(entry);
    }
  }
  return map;
}

/** Build a map of date → leave type set (for cell coloring) */
function buildDateTypeMap(leaves: LeaveRequest[], isManager: boolean): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const leave of leaves) {
    if (isManager) {
      if (leave.status !== 'Approved' && leave.status !== 'Pending') continue;
    } else {
      if (leave.status !== 'Approved') continue;
    }
    if (!leave.startDate || !leave.endDate) continue;
    for (const d of expandDateRange(leave.startDate, leave.endDate)) {
      if (!map.has(d)) map.set(d, new Set());
      map.get(d)!.add(leave.type);
    }
  }
  return map;
}

export const LeaveCalendar: React.FC<LeaveCalendarProps> = ({ userLeaves, teamLeaves, isManager = false, onLeaveClick, holidays = [] }) => {
  const { t } = useTranslation(['leave', 'common']);
  const { data: leaveConfigs = [] } = useLeaveTypeConfig();

  const MONTH_NAMES = useMemo(() => [
    t('common:months.january'), t('common:months.february'), t('common:months.march'),
    t('common:months.april'), t('common:months.may'), t('common:months.june'),
    t('common:months.july'), t('common:months.august'), t('common:months.september'),
    t('common:months.october'), t('common:months.november'), t('common:months.december'),
  ], [t]);

  const DAY_NAMES = useMemo(() => [
    t('common:weekdays.su'), t('common:weekdays.mo'), t('common:weekdays.tu'),
    t('common:weekdays.we'), t('common:weekdays.th'), t('common:weekdays.fr'),
    t('common:weekdays.sa'),
  ], [t]);
  const TYPE_COLORS = useMemo(() => {
    const colorMap = buildLeaveColorMap(leaveConfigs);
    const result: Record<string, { bg: string; text: string; dot: string; badge: string }> = {};
    for (const [type, colors] of Object.entries(colorMap)) {
      result[type] = { bg: colors.cellBg, text: colors.cellText, dot: colors.dot, badge: colors.badge };
    }
    return result;
  }, [leaveConfigs]);

  // Build holiday map: date string → holiday name
  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of holidays) {
      const end = h.endDate ?? h.date;
      for (const d of expandDateRange(h.date, end)) {
        map.set(d, h.name);
      }
    }
    return map;
  }, [holidays]);

  const [displayMonth, setDisplayMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOverTooltipRef = useRef(false);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const userDateTypes = useMemo(() => buildDateTypeMap(userLeaves, isManager), [userLeaves, isManager]);
  const teamDateTypes = useMemo(() => buildDateTypeMap(teamLeaves, isManager), [teamLeaves, isManager]);

  const userLeaveMap = useMemo(() => buildLeaveMap(userLeaves, true, isManager), [userLeaves, isManager]);
  const teamLeaveMap = useMemo(() => buildLeaveMap(teamLeaves, false, isManager), [teamLeaves, isManager]);

  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(new Date());

  const handlePrev = () => setDisplayMonth(new Date(year, month - 1, 1));
  const handleNext = () => setDisplayMonth(new Date(year, month + 1, 1));

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const remainder = cells.length % 7;
  if (remainder > 0) {
    for (let i = 0; i < 7 - remainder; i++) cells.push(null);
  }
  const totalRows = cells.length / 7;

  const handleCellEnter = useCallback((key: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    const userEntries = userLeaveMap.get(key) || [];
    const teamEntries = teamLeaveMap.get(key) || [];
    if (userEntries.length === 0 && teamEntries.length === 0 && !holidayMap.get(key)) return;

    setHoveredDay(key);
    if (gridRef.current) {
      const gridRect = gridRef.current.getBoundingClientRect();
      const cellRect = e.currentTarget.getBoundingClientRect();
      setTooltipPos({
        x: cellRect.left - gridRect.left + cellRect.width / 2,
        y: cellRect.top - gridRect.top,
      });
    }
  }, [userLeaveMap, teamLeaveMap]);

  const handleCellLeave = useCallback(() => {
    if (isManager) {
      hoverTimeoutRef.current = setTimeout(() => {
        if (!isOverTooltipRef.current) {
          setHoveredDay(null);
          setTooltipPos(null);
        }
      }, 150);
    } else {
      setHoveredDay(null);
      setTooltipPos(null);
    }
  }, [isManager]);

  const handleTooltipEnter = useCallback(() => {
    isOverTooltipRef.current = true;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handleTooltipLeave = useCallback(() => {
    isOverTooltipRef.current = false;
    setHoveredDay(null);
    setTooltipPos(null);
  }, []);

  const handleCellClick = useCallback((key: string) => {
    if (!isManager || !onLeaveClick) return;
    const entries = [...(userLeaveMap.get(key) || []), ...(teamLeaveMap.get(key) || [])];
    const single = entries[0];
    if (entries.length === 1 && single) {
      onLeaveClick(single.request);
    }
  }, [isManager, onLeaveClick, userLeaveMap, teamLeaveMap]);

  const tooltipEntries = useMemo(() => {
    if (!hoveredDay) return [];
    const user = userLeaveMap.get(hoveredDay) || [];
    const team = teamLeaveMap.get(hoveredDay) || [];
    return [...user, ...team];
  }, [hoveredDay, userLeaveMap, teamLeaveMap]);

  return (
    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-4 md:p-6 flex flex-col h-full">
      <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-4">{t('leave:calendar.teamCalendar')}</h2>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrev}
          className="p-1.5 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors"
        >
          <ChevronLeft size={18} className="text-text-light dark:text-text-dark" />
        </button>
        <span className="font-semibold text-sm text-text-light dark:text-text-dark">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={handleNext}
          className="p-1.5 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors"
        >
          <ChevronRight size={18} className="text-text-light dark:text-text-dark" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_NAMES.map((name) => (
          <div key={name} className="text-xs font-medium text-text-muted-light dark:text-text-muted-dark text-center py-1">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        ref={gridRef}
        className="grid grid-cols-7 gap-1 flex-1 relative"
        style={{ gridTemplateRows: `repeat(${totalRows}, 1fr)` }}
      >
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }

          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const userTypes = userDateTypes.get(key);
          const teamTypes = teamDateTypes.get(key);
          const isToday = key === todayKey;
          const hasLeave = userTypes || teamTypes;
          const holidayName = holidayMap.get(key);

          // Pick primary user leave type for background color
          const primaryUserType = userTypes ? [...userTypes][0] : null;
          const userColor = primaryUserType ? (TYPE_COLORS[primaryUserType] || DEFAULT_COLOR) : null;

          // Collect team dots (types not already shown by user bg)
          const teamDots: string[] = [];
          if (teamTypes) {
            for (const t of teamTypes) {
              if (!userTypes?.has(t)) teamDots.push(t);
            }
          }

          return (
            <div
              key={key}
              onMouseEnter={(e) => handleCellEnter(key, e)}
              onMouseLeave={handleCellLeave}
              onClick={() => handleCellClick(key)}
              className={`
                relative flex items-center justify-center rounded-lg text-sm min-h-[2.25rem]
                transition-all duration-150 select-none
                ${hasLeave && isManager ? 'cursor-pointer' : 'cursor-default'}
                ${userColor ? `${userColor.bg} ${userColor.text} font-medium` : ''}
                ${!userColor && holidayName ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 font-medium' : ''}
                ${!userColor && !holidayName && isToday ? 'ring-2 ring-primary font-semibold text-primary' : ''}
                ${!userColor && !holidayName && !isToday ? 'text-text-light dark:text-text-dark' : ''}
                ${hasLeave ? 'hover:scale-110 hover:shadow-md hover:z-10' : holidayName ? 'hover:bg-red-100 dark:hover:bg-red-900/30' : 'hover:bg-background-light dark:hover:bg-background-dark'}
              `}
            >
              {day}
              {/* Holiday dot */}
              {holidayName && !userColor && teamDots.length === 0 && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-400 dark:bg-red-500" />
              )}
              {/* Team leave type dots */}
              {teamDots.length > 0 && !userColor && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {teamDots.slice(0, 3).map((t) => {
                    const c = isManager ? (TYPE_COLORS[t] || DEFAULT_COLOR) : DEFAULT_COLOR;
                    return <span key={t} className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />;
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Tooltip */}
        {hoveredDay && tooltipPos && tooltipEntries.length > 0 && (
          <div
            className={`absolute z-50 ${isManager ? 'pointer-events-auto' : 'pointer-events-none'}`}
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y,
              transform: 'translate(-50%, -100%)',
            }}
            onMouseEnter={isManager ? handleTooltipEnter : undefined}
            onMouseLeave={isManager ? handleTooltipLeave : undefined}
          >
            <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg px-3 py-2 mb-1.5 min-w-[140px] max-w-[220px]">
              <p className="text-[11px] font-medium text-text-muted-light dark:text-text-muted-dark mb-1.5">
                {new Date(hoveredDay + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              {holidayMap.get(hoveredDay) && (
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-red-400 dark:bg-red-500" />
                  <span className="text-xs font-medium text-red-700 dark:text-red-300 truncate">{holidayMap.get(hoveredDay)}</span>
                </div>
              )}
              <div className="space-y-1">
                {tooltipEntries.map((entry, i) => {
                  const isEntryClickable = isManager && !!onLeaveClick;
                  // Manager sees type colors for all; employee sees type colors only for own leaves
                  const colors = (entry.isUser || isManager)
                    ? (TYPE_COLORS[entry.type] || DEFAULT_COLOR)
                    : DEFAULT_COLOR;

                  const content = (
                    <>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                      <span className="text-xs text-text-light dark:text-text-dark truncate">
                        {entry.isUser ? t('leave:calendar.you') : entry.name}
                      </span>
                      {isManager || entry.isUser ? (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-auto shrink-0 ${colors.badge}`}>
                          {getShortLabel(entry.type)}
                          {entry.request.status === 'Pending' && isManager ? ` ${t('leave:calendar.pendingLabel')}` : ''}
                        </span>
                      ) : (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-auto shrink-0 ${DEFAULT_COLOR.badge}`}>
                          {t('leave:calendar.onLeave')}
                        </span>
                      )}
                    </>
                  );

                  if (isEntryClickable) {
                    return (
                      <button
                        key={i}
                        onClick={() => onLeaveClick!(entry.request)}
                        className="flex items-center gap-2 w-full hover:bg-background-light dark:hover:bg-background-dark rounded px-1 py-0.5 transition-colors cursor-pointer"
                      >
                        {content}
                      </button>
                    );
                  }

                  return (
                    <div key={i} className="flex items-center gap-2">
                      {content}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 pt-4 pb-1 border-t border-border-light dark:border-border-dark">
        {Object.entries(TYPE_COLORS).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${colors.bg}`} />
            <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{translateLeaveType(type)}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500" />
          </div>
          <span className="text-xs text-text-muted-light dark:text-text-muted-dark">
            {isManager ? t('leave:calendar.team') : t('leave:calendar.teamOnLeave')}
          </span>
        </div>
        {holidays.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-50 dark:bg-red-900/20" />
            <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('leave:calendar.publicHoliday')}</span>
          </div>
        )}
      </div>
    </div>
  );
};
