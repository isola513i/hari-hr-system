import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, TrendingUp, AlertCircle, CheckCircle2, Briefcase, Timer, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAttendanceRecords, useAttendanceSummary } from '../hooks/queries';
import { formatTimeTH } from '../lib/date';
import { Dropdown, DropdownOption } from '../components/Dropdown';

interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalHours: number;
  overtimeHours?: number;
}

const Attendance: React.FC = () => {
  const { t, i18n } = useTranslation(['attendance', 'common']);
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statsExpanded, setStatsExpanded] = useState(false);

  const { data: records = [], isPending: loading } = useAttendanceRecords(
    user?.employeeId,
    selectedMonth,
    selectedYear,
  );
  const { data: summary } = useAttendanceSummary(
    user?.employeeId,
    selectedMonth,
    selectedYear,
  ) as { data: AttendanceSummary | undefined };

  const formatTime = formatTimeTH;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(i18n.language === 'th' ? 'th-TH' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const statusKey = (status: string) => status.toLowerCase().replace(/-/g, '').replace(/ /g, '');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'On-time':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Late':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'Absent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'On-leave':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const statCards = summary ? [
    { key: 'workingDays',  icon: <Briefcase size={14} />,   bg: 'bg-blue-100 dark:bg-blue-900/30',   color: 'text-blue-600 dark:text-blue-400',   label: t('attendance:employee.workingDays'), value: String(summary.totalDays) },
    { key: 'onTimeDays',   icon: <CheckCircle2 size={14} />, bg: 'bg-green-100 dark:bg-green-900/30',  color: 'text-green-600 dark:text-green-400',  label: t('attendance:employee.onTimeDays'),  value: String(summary.presentDays) },
    { key: 'lateDays',     icon: <AlertCircle size={14} />,  bg: 'bg-orange-100 dark:bg-orange-900/30',color: 'text-orange-600 dark:text-orange-400', label: t('attendance:employee.lateDays'),    value: String(summary.lateDays) },
    { key: 'totalHours',   icon: <Clock size={14} />,        bg: 'bg-purple-100 dark:bg-purple-900/30',color: 'text-purple-600 dark:text-purple-400', label: t('attendance:employee.totalHours'),  value: `${Number(summary.totalHours || 0).toFixed(1)}h` },
    { key: 'avgHoursDay',  icon: <TrendingUp size={14} />,   bg: 'bg-teal-100 dark:bg-teal-900/30',   color: 'text-teal-600 dark:text-teal-400',   label: t('attendance:employee.avgHoursDay'), value: `${summary.totalDays > 0 ? (Number(summary.totalHours || 0) / summary.totalDays).toFixed(1) : '0'}h` },
    { key: 'overtime',     icon: <Timer size={14} />,        bg: 'bg-amber-100 dark:bg-amber-900/30',  color: 'text-amber-600 dark:text-amber-400',  label: t('attendance:employee.overtime'),    value: `${Number(summary.overtimeHours || 0).toFixed(1)}h` },
  ] : [];

  const renderStatCard = ({ key, icon, bg, color, label, value }: typeof statCards[0]) => (
    <div key={key} className="p-2.5 sm:p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl hover:shadow-md transition-shadow flex flex-col gap-1.5 sm:gap-2">
      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bg} ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] sm:text-xs font-medium text-text-muted-light dark:text-text-muted-dark leading-tight">{label}</p>
        <p className="text-base sm:text-2xl font-bold text-text-light dark:text-text-dark mt-0.5 leading-none">{value}</p>
      </div>
    </div>
  );

  const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'].map(m => t('common:months.' + m));
  const monthOptions: DropdownOption[] = monthNames.map((label, i) => ({ value: String(i), label }));

  const yearOptions: DropdownOption[] = [
    { value: '2024', label: '2024' },
    { value: '2025', label: '2025' },
    { value: '2026', label: '2026' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">
            {t('attendance:employee.title')}
          </h1>
          <p className="text-sm sm:text-base text-text-muted-light dark:text-text-muted-dark mt-1">
            {t('attendance:employee.subtitle')}
          </p>
        </div>

        {/* Month/Year Selector */}
        <div className="flex gap-2 sm:gap-3">
          <Dropdown
            options={monthOptions}
            value={String(selectedMonth)}
            onChange={(val) => setSelectedMonth(Number(val))}
            width="w-36 sm:w-40"
          />
          <Dropdown
            options={yearOptions}
            value={String(selectedYear)}
            onChange={(val) => setSelectedYear(Number(val))}
            width="w-24 sm:w-28"
          />
        </div>
      </div>

      {/* Summary Cards */}
      {statCards.length > 0 && (
        <div>
          <div className="hidden sm:grid sm:grid-cols-6 gap-3">
            {statCards.map(renderStatCard)}
          </div>
          <div className="sm:hidden">
            <div className="grid grid-cols-3 gap-2">
              {statCards.slice(0, 3).map(renderStatCard)}
            </div>
            <div className={`grid grid-cols-3 gap-2 mt-2 overflow-hidden transition-all duration-300 ${statsExpanded ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'}`}>
              {statCards.slice(3).map(renderStatCard)}
            </div>
            <button
              onClick={() => setStatsExpanded(p => !p)}
              className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-text-muted-light dark:text-text-muted-dark hover:text-primary transition-colors"
            >
              {statsExpanded ? t('common:showLess', { defaultValue: 'ดูน้อยลง' }) : t('common:showMore', { defaultValue: 'ดูเพิ่มเติม' })}
              <ChevronDown size={14} className={`transition-transform duration-300 ${statsExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Attendance Records */}
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-border-light dark:border-border-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('attendance:employee.date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('attendance:employee.checkIn')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('attendance:employee.checkOut')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('attendance:employee.totalHours')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('attendance:employee.overtime')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">{t('attendance:employee.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-muted-light dark:text-text-muted-dark">{t('attendance:employee.loading')}</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-muted-light dark:text-text-muted-dark">{t('attendance:employee.noRecords')}</td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">{formatDate(record.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">{formatTime(record.clockIn)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                      {record.autoCheckout ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">ไม่ได้เช็คเอ้าท์</span>
                      ) : (
                        formatTime(record.clockOut)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">{record.totalHours != null ? `${Number(record.totalHours).toFixed(1)}h` : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                      {record.overtimeHours != null && record.overtimeHours > 0
                        ? <span className="text-amber-600 dark:text-amber-400 font-medium">{Number(record.overtimeHours).toFixed(1)}h</span>
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>{t('common:status.' + statusKey(record.status), { defaultValue: record.status })}</span>
                        {record.earlyDeparture && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">{t('common:status.early')}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-border-light dark:divide-border-dark">
          {loading ? (
            <div className="py-8 text-center text-text-muted-light dark:text-text-muted-dark">{t('attendance:employee.loading')}</div>
          ) : records.length === 0 ? (
            <div className="py-8 text-center text-text-muted-light dark:text-text-muted-dark">{t('attendance:employee.noRecords')}</div>
          ) : (
            records.map((record) => (
              <div key={record.id} className="px-4 py-3.5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-text-light dark:text-text-dark">{formatDate(record.date)}</p>
                  <div className="flex items-center gap-1">
                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                      {t('common:status.' + statusKey(record.status), { defaultValue: record.status })}
                    </span>
                    {record.autoCheckout && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">{t('common:auto')}</span>
                    )}
                    {record.earlyDeparture && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">{t('common:status.early')}</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-text-muted-light dark:text-text-muted-dark w-10 shrink-0">{t('attendance:employee.in')}</span>
                    <span className="text-sm font-medium text-text-light dark:text-text-dark">{formatTime(record.clockIn)}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-text-muted-light dark:text-text-muted-dark w-10 shrink-0">{t('attendance:employee.out')}</span>
                    {record.autoCheckout ? (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">ไม่ได้เช็คเอ้าท์</span>
                    ) : (
                      <span className="text-sm font-medium text-text-light dark:text-text-dark">{formatTime(record.clockOut)}</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-text-muted-light dark:text-text-muted-dark w-10 shrink-0">{t('common:time.hours')}</span>
                    <span className="text-sm font-medium text-text-light dark:text-text-dark">{record.totalHours != null ? `${Number(record.totalHours).toFixed(1)}h` : '-'}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-text-muted-light dark:text-text-muted-dark w-10 shrink-0">{t('attendance:employee.ot')}</span>
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      {record.overtimeHours != null && record.overtimeHours > 0 ? `${Number(record.overtimeHours).toFixed(1)}h` : '-'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance;
