import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, ChevronDown } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';
import { useAnalyticsDashboard } from '../hooks/queries';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#64748b', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

// Skeleton placeholder for a chart card
const ChartSkeleton: React.FC = () => (
  <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
    <div className="h-5 w-48 bg-background-light dark:bg-background-dark/50 rounded animate-pulse mb-2" />
    <div className="h-3 w-64 bg-background-light dark:bg-background-dark/50 rounded animate-pulse mb-6" />
    <div className="h-[280px] bg-background-light dark:bg-background-dark/50 rounded-lg animate-pulse" />
  </div>
);

function toCsvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',');
}

function downloadCsv(content: string, filename: string): void {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - i);

export const Analytics: React.FC = () => {
  const { t } = useTranslation(['analytics', 'common']);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const { data, isLoading } = useAnalyticsDashboard(selectedYear);

  const exportToCSV = useCallback(() => {
    if (!data) return;
    const date = new Date().toISOString().split('T')[0];
    const sections: string[] = [];

    sections.push(
      t('headcountGrowth.title'),
      toCsvRow(['Month', 'New Hires']),
      ...(data.headcount || []).map(r => toCsvRow([r.name, r.value])),
      '',
      t('departmentDistribution.title'),
      toCsvRow(['Department', 'Employees']),
      ...(data.departments || []).map(r => toCsvRow([r.name, r.value])),
      '',
      t('attendanceTrends.title'),
      toCsvRow(['Day', 'On Time', 'Late', 'Absent']),
      ...(data.attendance || []).map((r: any) => toCsvRow([r.day, r.onTime, r.late, r.absent])),
      '',
      t('leaveUsage.title'),
      toCsvRow(['Leave Type', 'Days', 'Requests']),
      ...(data.leaveByType || []).map((r: any) => toCsvRow([r.type, r.days, r.requests])),
      '',
      t('performanceDistribution.title'),
      toCsvRow(['Rating', 'Label', 'Reviews']),
      ...(data.performance || []).map((r: any) => toCsvRow([r.rating, r.label, r.count])),
      '',
      t('turnover.title'),
      toCsvRow(['Month', 'Hires', 'Departures']),
      ...(data.turnover || []).map((r: any) => toCsvRow([r.name, r.hires, r.departures])),
    );

    downloadCsv(sections.join('\n'), `analytics-report-${selectedYear}-${date}.csv`);
  }, [data, t]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <div className="h-8 w-56 bg-background-light dark:bg-background-dark/50 rounded animate-pulse mb-2" />
          <div className="h-4 w-80 bg-background-light dark:bg-background-dark/50 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <ChartSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const tooltipStyle = {
    backgroundColor: 'var(--color-card, #fff)',
    borderRadius: '8px',
    border: '1px solid var(--color-border, #e2e8f0)',
    fontSize: '12px',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">{t('title')}</h1>
          <p className="text-text-muted-light dark:text-text-muted-dark text-base mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="appearance-none pl-3 pr-8 py-2 text-sm font-medium bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted-light dark:text-text-muted-dark" />
          </div>
          <button
            onClick={exportToCSV}
            disabled={!data}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            {t('common:buttons.export')}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── 1. Headcount Growth ─────────────────────────────────── */}
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
          <h2 className="text-lg font-bold text-text-light dark:text-text-dark">{t('headcountGrowth.title')}</h2>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-5">{t('headcountGrowth.subtitle')}</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.headcount || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
                <Bar dataKey="value" name={t('headcountGrowth.newHires')} fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── 2. Department Distribution ──────────────────────────── */}
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
          <h2 className="text-lg font-bold text-text-light dark:text-text-dark">{t('departmentDistribution.title')}</h2>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-5">{t('departmentDistribution.subtitle')}</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.departments || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {(data?.departments || []).map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span className="text-xs text-text-light dark:text-text-dark">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── 3. Attendance Trends ────────────────────────────────── */}
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
          <h2 className="text-lg font-bold text-text-light dark:text-text-dark">{t('attendanceTrends.title')}</h2>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-5">{t('attendanceTrends.subtitle')}</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.attendance || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="onTime" name={t('attendanceTrends.onTime')} stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="late" name={t('attendanceTrends.late')} stackId="a" fill="#f59e0b" />
                <Bar dataKey="absent" name={t('attendanceTrends.absent')} stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── 4. Leave Usage by Type ─────────────────────────────── */}
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
          <h2 className="text-lg font-bold text-text-light dark:text-text-dark">{t('leaveUsage.title')}</h2>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-5">{t('leaveUsage.subtitle')}</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.leaveByType || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                <YAxis
                  dataKey="type"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  width={110}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="days" name={t('leaveUsage.days')} fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={20} />
                <Bar dataKey="requests" name={t('leaveUsage.requests')} fill="#c4b5fd" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── 5. Performance Distribution ─────────────────────────── */}
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
          <h2 className="text-lg font-bold text-text-light dark:text-text-dark">{t('performanceDistribution.title')}</h2>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-5">{t('performanceDistribution.subtitle')}</p>
          <div className="h-[280px]">
            {data?.performance?.every((p) => p.count === 0) ? (
              <div className="flex items-center justify-center h-full text-sm text-text-muted-light dark:text-text-muted-dark">
                {t('performanceDistribution.noData')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.performance || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name={t('performanceDistribution.reviews')} fill="#10b981" radius={[6, 6, 0, 0]} barSize={40}>
                    {(data?.performance || []).map((entry, index) => (
                      <Cell
                        key={index}
                        fill={
                          entry.rating <= 1 ? '#ef4444' :
                          entry.rating === 2 ? '#f59e0b' :
                          entry.rating === 3 ? '#3b82f6' :
                          entry.rating === 4 ? '#10b981' : '#059669'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── 6. Turnover Overview ────────────────────────────────── */}
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
          <h2 className="text-lg font-bold text-text-light dark:text-text-dark">{t('turnover.title')}</h2>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-5">{t('turnover.subtitle')}</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.turnover || []}>
                <defs>
                  <linearGradient id="gradHires" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDepartures" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="hires" name={t('turnover.hires')} stroke="#3b82f6" strokeWidth={2} fill="url(#gradHires)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
                <Area type="monotone" dataKey="departures" name={t('turnover.departures')} stroke="#ef4444" strokeWidth={2} fill="url(#gradDepartures)" dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};
