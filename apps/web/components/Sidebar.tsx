import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GitGraph,
  BarChart2,
  FileText,
  Settings,
  HelpCircle,
  LogOut,
  ShieldCheck,
  Smile,
  ClipboardList,
  Calendar,
  DollarSign,
  MessageSquare,
  Clock,
  ClipboardCheck,
  GraduationCap,
  Star,
  Package,
  ScrollText,
  CalendarClock,
  Inbox,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLeaveRequests, useExpenseClaims, useAdminWFHRequests, useOTStats } from '../hooks/queries';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  allowed: boolean;
  badge?: boolean;
}

interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { t } = useTranslation('common');
  const { user, logout, isAdminView } = useAuth();
  const isHrAdmin = user?.role === 'HR_ADMIN';
  const isManager = user?.role === 'MANAGER';
  const { data: leaveRequests = [] } = useLeaveRequests();
  const hasPendingLeaves = isAdminView && leaveRequests.some(
    (r) => r.status === 'Pending' || r.status === 'Cancel Requested',
  );
  const { data: expenseClaims = [] } = useExpenseClaims();
  const hasPendingExpenses = isAdminView && Array.isArray(expenseClaims) && expenseClaims.some(
    (c) => c.status === 'Pending',
  );
  const { data: wfhRequests = [] } = useAdminWFHRequests(isAdminView && (isHrAdmin || isManager) ? {} : false);
  const hasPendingWFH = isAdminView && (wfhRequests as { status: string }[]).some((r) => r.status === 'pending');
  const { data: otStats } = useOTStats();
  const hasPendingOT = isAdminView && (otStats?.pending ?? 0) > 0;
  const hasPendingRequests = hasPendingLeaves || hasPendingWFH || hasPendingOT || hasPendingExpenses;

  const navGroups: NavGroup[] = [
    {
      key: 'overview',
      label: '',
      items: [
        { icon: <LayoutDashboard size={20} />, label: t('nav.dashboard'), path: '/', allowed: true },
      ],
    },
    {
      key: 'time',
      label: t('nav.timeAttendance', 'Time & Attendance'),
      items: [
        { icon: <ClipboardCheck size={20} />, label: t('nav.attendance'), path: '/admin-attendance', allowed: isAdminView && (isHrAdmin || isManager) },
        { icon: <Inbox size={20} />, label: t('nav.requests', 'Requests'), path: '/requests', allowed: isAdminView && (isHrAdmin || isManager), badge: hasPendingRequests },
        { icon: <Calendar size={20} />, label: t('nav.holidays'), path: '/holidays', allowed: isAdminView && isHrAdmin },
        { icon: <CalendarClock size={20} />, label: t('nav.shifts', 'Shifts'), path: '/shift-management', allowed: isAdminView && (isHrAdmin || isManager) },
        { icon: <Clock size={20} />, label: t('nav.attendance'), path: '/attendance', allowed: !isAdminView },
        { icon: <Calendar size={20} />, label: t('nav.timeOff'), path: '/time-off', allowed: !isAdminView },
      ],
    },
    {
      key: 'finance',
      label: t('nav.finance', 'Finance'),
      items: [
        { icon: <DollarSign size={20} />, label: t('nav.payroll'), path: '/payroll', allowed: true },
        { icon: <FileText size={20} />, label: t('nav.expenses'), path: '/expenses', allowed: !isAdminView },
      ],
    },
    {
      key: 'people',
      label: t('nav.people', 'People'),
      items: [
        { icon: <Users size={20} />, label: t('nav.employees'), path: '/employees', allowed: true },
        { icon: <GitGraph size={20} />, label: t('nav.orgChart'), path: '/org-chart', allowed: true },
        { icon: <ClipboardList size={20} />, label: t('nav.onboarding'), path: '/onboarding', allowed: true },
        { icon: <GraduationCap size={20} />, label: t('nav.training', 'Training'), path: '/training', allowed: isAdminView && (isHrAdmin || isManager) },
      ],
    },
    {
      key: 'performance',
      label: t('nav.performance', 'Performance'),
      items: [
        { icon: <Star size={20} />, label: t('nav.performanceReviews', 'Performance Reviews'), path: '/performance-reviews', allowed: true },
        { icon: <MessageSquare size={20} />, label: t('nav.surveys'), path: '/surveys', allowed: true },
        { icon: <Smile size={20} />, label: t('nav.wellbeing'), path: '/wellbeing', allowed: true },
      ],
    },
    {
      key: 'operations',
      label: t('nav.operations', 'Operations'),
      items: [
        { icon: <Package size={20} />, label: t('nav.assets', 'Assets'), path: '/assets', allowed: isAdminView && isHrAdmin },
        { icon: <ShieldCheck size={20} />, label: t('nav.compliance'), path: '/compliance', allowed: isAdminView && isHrAdmin },
        { icon: <BarChart2 size={20} />, label: t('nav.analytics'), path: '/analytics', allowed: isAdminView && isHrAdmin },
        { icon: <FileText size={20} />, label: t('nav.documents'), path: '/documents', allowed: true },
      ],
    },
    {
      key: 'system',
      label: t('nav.system', 'System'),
      items: [
        { icon: <ScrollText size={20} />, label: t('nav.auditLogs', 'Audit Logs'), path: '/audit-logs', allowed: isAdminView && isHrAdmin },
      ],
    },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-primary-dark text-white flex flex-col h-full shadow-xl" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="p-6 pb-8 border-b border-white/10">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="aspect-square w-10 h-10 rounded-lg overflow-hidden shadow-lg bg-white flex items-center justify-center group-hover:shadow-xl transition-shadow">
            <img
              src="/logo/AIYA_Logo.png"
              alt="AIYA Logo"
              className="w-full h-full object-contain p-1"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-white text-base font-bold leading-tight group-hover:text-gray-200 transition-colors">HARI</h1>
            <p className="text-gray-400 text-xs font-medium">{t('sidebar.byAiya')} • {isAdminView ? t('sidebar.admin') : t('sidebar.employee')}</p>
          </div>
        </Link>
      </div>

      <nav className="flex flex-col flex-grow p-3 overflow-y-auto no-scrollbar gap-1">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.allowed);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.key} className="mb-1">
              {group.label && (
                <p className="px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1 mt-3">
                  {group.label}
                </p>
              )}
              {visibleItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  {item.icon}
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="w-2 h-2 rounded-full bg-red-500 ml-auto shrink-0" />
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex flex-col gap-1">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                ? 'bg-white/10 text-white'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Settings size={18} />
            <span className="text-sm font-medium">{t('nav.settings')}</span>
          </NavLink>
          <NavLink
            to="/help"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                ? 'bg-white/10 text-white'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <HelpCircle size={18} />
            <span className="text-sm font-medium">{t('nav.helpSupport')}</span>
          </NavLink>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-colors mt-2 text-left"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">{t('nav.signOut')}</span>
          </button>
        </div>
        <div style={{ height: 'env(safe-area-inset-bottom)' }} />
      </div>
    </aside>
  );
};
