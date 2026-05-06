import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ReferenceArea } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';
import { Avatar } from './Avatar';
import type { AttendanceAnalytics, PublicHoliday } from '../types';

interface Props {
  data: AttendanceAnalytics;
  holidays?: PublicHoliday[];
}

const isWeekend = (dateStr: string) => {
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00Z');
  const day = d.getUTCDay();
  return day === 0 || day === 6;
};

const isHoliday = (dateStr: string, holidays: PublicHoliday[]) => {
  const date = dateStr.slice(0, 10);
  return holidays.some((h) => {
    const start = h.date.slice(0, 10);
    const end = (h.endDate ?? h.date).slice(0, 10);
    return date >= start && date <= end;
  });
};

const formatChartDate = (dateStr: string) => {
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; payload: { date: string; present: number; total: number; late: number; isOff: boolean; holidayName?: string } }[];
  label?: string;
}) => {
  if (!active || !payload?.length || !payload[0]) return null;
  const { date, present, total, late, holidayName } = payload[0].payload;
  const rate = payload[0].value;
  const weekend = isWeekend(date);
  const offLabel = holidayName ?? (weekend ? 'Weekend' : null);
  return (
    <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg p-3 text-xs min-w-[130px]">
      <p className="font-semibold text-text-light dark:text-text-dark mb-2">
        {label}{offLabel ? <span className="ml-1.5 text-text-muted-light dark:text-text-muted-dark font-normal">· {offLabel}</span> : null}
      </p>
      <p className="text-2xl font-bold text-teal-600 dark:text-teal-400 mb-1">{rate}%</p>
      <p className="text-text-muted-light dark:text-text-muted-dark">{present} of {total} employees</p>
      {late > 0 && <p className="text-orange-500 dark:text-orange-400 mt-1">{late} arrived late</p>}
    </div>
  );
};

export const AttendanceAnalyticsPanel: React.FC<Props> = ({ data, holidays = [] }) => {
  const chartData = data.dailyRate.map((d) => {
    const off = isWeekend(d.date) || isHoliday(d.date, holidays);
    const holiday = !isWeekend(d.date) && isHoliday(d.date, holidays)
      ? holidays.find((h) => {
          const date = d.date.slice(0, 10);
          const start = h.date.slice(0, 10);
          const end = (h.endDate ?? h.date).slice(0, 10);
          return date >= start && date <= end;
        })?.name
      : undefined;
    return { ...d, label: formatChartDate(d.date), isOff: off, holidayName: holiday };
  });

  // Exclude weekends + holidays from average
  const weekdayData = chartData.filter((d) => !d.isOff);
  const avg = weekdayData.length > 0
    ? Math.round(weekdayData.reduce((s, d) => s + d.rate, 0) / weekdayData.length)
    : 0;

  const today = chartData[chartData.length - 1];
  const yesterday = chartData[chartData.length - 2];
  const todayRate = today?.rate ?? 0;
  const trend = todayRate - (yesterday?.rate ?? 0);

  // Off-day reference areas (weekends + holidays)
  const offAreas: { x1: string; x2: string }[] = [];
  chartData.forEach((d, i) => {
    if (d.isOff) {
      const prev = offAreas[offAreas.length - 1];
      if (prev && chartData[i - 1]?.isOff) {
        prev.x2 = d.label;
      } else {
        offAreas.push({ x1: d.label, x2: d.label });
      }
    }
  });

  const TrendIcon = trend > 2 ? TrendingUp : trend < -2 ? TrendingDown : Minus;
  const trendColor = trend > 2 ? 'text-green-500' : trend < -2 ? 'text-red-500' : 'text-text-muted-light dark:text-text-muted-dark';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Trend Chart — takes 2/3 */}
      <div className="lg:col-span-2 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl p-5 shadow-sm">
        {/* Header with KPI summary */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="font-semibold text-text-light dark:text-text-dark text-sm">Attendance Rate</p>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark">Last 7 days · weekday avg excludes weekends</p>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-background-light dark:bg-background-dark rounded-lg px-3 py-2">
            <p className="text-[10px] text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide mb-0.5">Today</p>
            <p className="text-xl font-bold text-teal-600 dark:text-teal-400">{todayRate}%</p>
            <p className="text-[10px] text-text-muted-light dark:text-text-muted-dark">{today?.present ?? 0} / {today?.total ?? 0} employees</p>
          </div>
          <div className="bg-background-light dark:bg-background-dark rounded-lg px-3 py-2">
            <p className="text-[10px] text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide mb-0.5">7-day Avg</p>
            <p className="text-xl font-bold text-text-light dark:text-text-dark">{avg}%</p>
            <p className="text-[10px] text-text-muted-light dark:text-text-muted-dark">weekdays only</p>
          </div>
          <div className="bg-background-light dark:bg-background-dark rounded-lg px-3 py-2">
            <p className="text-[10px] text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide mb-0.5">vs Yesterday</p>
            <div className={`flex items-center gap-1 ${trendColor}`}>
              <TrendIcon size={18} />
              <p className="text-xl font-bold">{trend > 0 ? '+' : ''}{trend}%</p>
            </div>
            <p className="text-[10px] text-text-muted-light dark:text-text-muted-dark">day-over-day</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border-light dark:stroke-border-dark" />
            {/* Weekend + holiday shading */}
            {offAreas.map((w) => (
              <ReferenceArea key={w.x1} x1={w.x1} x2={w.x2} fill="#94a3b8" fillOpacity={0.08} />
            ))}
            {/* Average reference line */}
            <ReferenceLine y={avg} stroke="#94a3b8" strokeDasharray="4 3" strokeWidth={1.5}
              label={{ value: `Avg ${avg}%`, position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="rate" stroke="#0d9488" strokeWidth={2} fill="url(#attendGrad)" dot={false} activeDot={{ r: 4, fill: '#0d9488' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Top Late Arrivals — takes 1/3 */}
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
            <Clock size={18} />
          </div>
          <div>
            <p className="font-semibold text-text-light dark:text-text-dark text-sm">Top Late Arrivals</p>
            <p className="text-xs text-text-muted-light dark:text-text-muted-dark">This month</p>
          </div>
        </div>
        {data.topLate.length === 0 ? (
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark text-center py-6">No late arrivals this month</p>
        ) : (
          <ul className="space-y-3">
            {data.topLate.map((emp, i) => (
              <li key={emp.employeeId} className="flex items-center gap-3">
                <span className="text-xs font-bold text-text-muted-light dark:text-text-muted-dark w-4">{i + 1}</span>
                <Avatar src={emp.avatar} name={emp.name} size="sm" />
                <p className="flex-1 text-sm font-medium text-text-light dark:text-text-dark truncate">{emp.name}</p>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                  {emp.lateCount}×
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
