import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Building2, ClipboardClock } from 'lucide-react';

interface HeaderAttendanceStatus {
  clockIn?: string;
  clockOut?: string;
  status?: string;
  autoCheckout?: boolean;
  checkInType?: string;
}

interface DashboardHeaderProps {
  userName?: string;
  pendingRequestsCount: number;
  attendanceStatus?: HeaderAttendanceStatus;
  isClockingIn: boolean;
  onClockAction: () => void;
  onRequestCorrection: () => void;
  onRequestWFH: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userName,
  pendingRequestsCount,
  attendanceStatus,
  isClockingIn,
  onClockAction,
  onRequestCorrection,
  onRequestWFH,
}) => {
  const { t } = useTranslation(['dashboard', 'common']);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">{t('dashboard:employee.greeting', { name: userName?.split(' ')[0] })}</h1>
          <p className="text-sm sm:text-base text-text-muted-light dark:text-text-muted-dark mt-1">{t('dashboard:employee.pendingRequests', { count: pendingRequestsCount })}</p>
        </div>
        <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
          {/* Attendance Status Badge */}
          {attendanceStatus?.clockIn && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                attendanceStatus.clockOut
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : attendanceStatus.status === 'Late'
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  attendanceStatus.clockOut
                    ? 'bg-green-500'
                    : attendanceStatus.status === 'Late'
                    ? 'bg-orange-500 animate-pulse'
                    : 'bg-blue-500 animate-pulse'
                }`}></div>
                <span>
                  {attendanceStatus.clockOut
                    ? (attendanceStatus.autoCheckout ? t('dashboard:employee.autoCheckout') : t('dashboard:employee.completed'))
                    : attendanceStatus.status === 'Late'
                    ? t('dashboard:employee.workingLate')
                    : t('dashboard:employee.working')}
                </span>
              </div>
              {attendanceStatus.checkInType && attendanceStatus.checkInType !== 'office' && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  attendanceStatus.checkInType === 'wfh'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                    : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                }`}>
                  {attendanceStatus.checkInType === 'wfh' ? 'WFH' : 'Remote'}
                </span>
              )}
            </div>
          )}

          {/* Check In/Out + WFH request buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRequestCorrection}
              title={t('dashboard:employee.requestCorrection')}
              aria-label={t('dashboard:employee.requestCorrection')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-muted-light dark:text-text-muted-dark border border-border-light dark:border-border-dark rounded-lg hover:border-teal-400 hover:text-teal-600 dark:hover:text-teal-400 transition-all"
            >
              <ClipboardClock size={15} />
              <span className="hidden sm:inline">{t('dashboard:employee.requestCorrection')}</span>
            </button>
            {!attendanceStatus?.clockIn && (
              <button
                onClick={onRequestWFH}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-muted-light dark:text-text-muted-dark border border-border-light dark:border-border-dark rounded-lg hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-400 transition-all"
              >
                <Building2 size={15} />
                WFH
              </button>
            )}
            <button
              onClick={onClockAction}
              disabled={isClockingIn || !!(attendanceStatus?.clockIn && attendanceStatus?.clockOut)}
              className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg text-sm shadow-sm transition-all ${
                attendanceStatus?.clockIn && !attendanceStatus?.clockOut
                  ? 'bg-accent-orange text-white hover:bg-accent-orange/90 hover:shadow-md'
                  : attendanceStatus?.clockOut
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90 hover:shadow-md'
              } ${isClockingIn ? 'opacity-70 cursor-wait' : ''}`}
            >
              <Clock size={18} />
              {isClockingIn
                ? (attendanceStatus?.clockIn ? t('common:buttons.loading') : t('dashboard:employee.gettingGPS'))
                : attendanceStatus?.clockIn && !attendanceStatus?.clockOut
                ? t('dashboard:employee.checkOut')
                : attendanceStatus?.clockOut
                ? t('dashboard:employee.doneForToday')
                : t('dashboard:employee.checkIn')}
            </button>
          </div>
        </div>
      </div>
  );
};
