import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Navigate } from 'react-router-dom';
import { Inbox, Home, Timer, Calendar, DollarSign, ClipboardClock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminWFHRequests, useLeaveRequests, useExpenseClaims, useOTStats, useAllRegularizationRequests, type RegularizationRequest } from '../hooks/queries';
import { WFHRequestsTab } from '../components/requests/WFHRequestsTab';
import { OTRequestsTab } from '../components/requests/OTRequestsTab';
import { LeaveRequestsTab } from '../components/requests/LeaveRequestsTab';
import { ExpenseRequestsTab } from '../components/requests/ExpenseRequestsTab';
import { AttendanceRegularizationTab } from '../components/requests/AttendanceRegularizationTab';

type TabKey = 'leave' | 'wfh' | 'ot' | 'expense' | 'attendance_reg';

export const Requests: React.FC = () => {
  const { t } = useTranslation(['requests']);
  const { user, isAdminView } = useAuth();
  const isHrAdmin = user?.role === 'HR_ADMIN';
  const isManager = user?.role === 'MANAGER';

  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as TabKey) || 'leave';

  useEffect(() => {
    if (!searchParams.get('tab')) {
      setSearchParams({ tab: 'leave' }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Badge counts
  const { data: leaveRequests = [] } = useLeaveRequests();
  const { data: wfhRequests = [] } = useAdminWFHRequests(isAdminView && (isHrAdmin || isManager) ? {} : false);
  const { data: expenseClaims = [] } = useExpenseClaims();
  const { data: otStatsData } = useOTStats();
  const { data: regRequests = [] } = useAllRegularizationRequests(isAdminView && (isHrAdmin || isManager) ? {} : false);

  const pendingLeaves = leaveRequests.filter(
    (r) => r.status === 'Pending' || r.status === 'Cancel Requested'
  ).length;
  const pendingWFH = (wfhRequests as { status: string }[]).filter(
    (r) => r.status === 'pending' || r.status === 'manager_approved'
  ).length;
  const pendingOT = otStatsData?.pending ?? 0;
  const pendingExpenses = Array.isArray(expenseClaims)
    ? expenseClaims.filter((c) => c.status === 'Pending').length
    : 0;
  const pendingReg = (regRequests as RegularizationRequest[]).filter(
    (r) => r.status === 'pending' || r.status === 'manager_approved'
  ).length;

  const badgeCounts: Record<TabKey, number> = {
    leave: pendingLeaves,
    wfh: pendingWFH,
    ot: pendingOT,
    expense: pendingExpenses,
    attendance_reg: pendingReg,
  };

  if (!isAdminView || (!isHrAdmin && !isManager)) {
    return <Navigate to="/" replace />;
  }

  const setTab = (key: TabKey) => setSearchParams({ tab: key });

  const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'leave',   label: t('tabs.leave'),   icon: <Calendar size={15} /> },
    { key: 'wfh',     label: t('tabs.wfh'),     icon: <Home size={15} /> },
    { key: 'ot',      label: t('tabs.ot'),      icon: <Timer size={15} /> },
    { key: 'expense', label: t('tabs.expense'), icon: <DollarSign size={15} /> },
    { key: 'attendance_reg', label: t('tabs.attendanceReg'), icon: <ClipboardClock size={15} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          <Inbox size={22} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">
            {t('page.title')}
          </h1>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-0.5">
            {t('page.subtitle')}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border-light dark:border-border-dark">
        {TABS.map(({ key, label, icon }) => {
          const count = badgeCounts[key];
          const isActive = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark'
              }`}
            >
              {icon}
              <span>{label}</span>
              {count > 0 && !isActive && (
                <span className="ml-0.5 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full leading-none">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === 'leave'   && <LeaveRequestsTab />}
      {tab === 'wfh'     && <WFHRequestsTab />}
      {tab === 'ot'      && <OTRequestsTab />}
      {tab === 'expense' && <ExpenseRequestsTab />}
      {tab === 'attendance_reg' && <AttendanceRegularizationTab />}
    </div>
  );
};
