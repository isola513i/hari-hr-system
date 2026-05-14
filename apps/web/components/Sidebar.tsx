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
  GraduationCap,
  Star,
  CalendarDays,
  Package,
  ScrollText,
  CalendarClock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLeaveRequests, useExpenseClaims, useAdminWFHRequests } from '../hooks/queries';

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

  // Define nav items based on role
  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: t('nav.dashboard'), path: '/', allowed: true },

    // Admin Attendance — for HR_ADMIN and MANAGER
    { icon: <Clock size={20} />, label: t('nav.attendance'), path: '/admin-attendance', allowed: isAdminView && (isHrAdmin || isManager) },
    { icon: <Calendar size={20} />, label: t('nav.leaveRequests'), path: '/leave-requests', allowed: isAdminView && (isHrAdmin || isManager) },
    { icon: <Calendar size={20} />, label: t('nav.holidays'), path: '/holidays', allowed: isAdminView && isHrAdmin },

    // Employee Focused Tools
    { icon: <Clock size={20} />, label: t('nav.attendance'), path: '/attendance', allowed: !isAdminView },
    { icon: <Calendar size={20} />, label: t('nav.timeOff'), path: '/time-off', allowed: !isAdminView },
    { icon: <Calendar size={20} />, label: t('nav.holidays'), path: '/company-holidays', allowed: false },
    { icon: <DollarSign size={20} />, label: t('nav.payroll'), path: '/payroll', allowed: true },
    { icon: <FileText size={20} />, label: t('nav.expenses'), path: '/expenses', allowed: true },
    { icon: <MessageSquare size={20} />, label: t('nav.surveys'), path: '/surveys', allowed: true },

    { icon: <Smile size={20} />, label: t('nav.wellbeing'), path: '/wellbeing', allowed: true },
    { icon: <Users size={20} />, label: t('nav.employees'), path: '/employees', allowed: true },
    { icon: <GitGraph size={20} />, label: t('nav.orgChart'), path: '/org-chart', allowed: true },
    { icon: <ClipboardList size={20} />, label: t('nav.onboarding'), path: '/onboarding', allowed: true },
    { icon: <GraduationCap size={20} />, label: t('nav.training', 'Training'), path: '/training', allowed: isAdminView && (isHrAdmin || isManager) },
    { icon: <CalendarClock size={20} />, label: 'Shifts', path: '/shift-management', allowed: isAdminView && (isHrAdmin || isManager) },

    { icon: <Star size={20} />, label: 'Performance Reviews', path: '/performance-reviews', allowed: true },
    { icon: <CalendarDays size={20} />, label: 'Team Calendar', path: '/team-calendar', allowed: isAdminView && (isHrAdmin || isManager) },
    { icon: <Package size={20} />, label: 'Assets', path: '/assets', allowed: isAdminView && isHrAdmin },

    // Admin Specific — HR_ADMIN only
    { icon: <ShieldCheck size={20} />, label: t('nav.compliance'), path: '/compliance', allowed: isAdminView && isHrAdmin },
    { icon: <ScrollText size={20} />, label: 'Audit Logs', path: '/audit-logs', allowed: isAdminView && isHrAdmin },
    { icon: <BarChart2 size={20} />, label: t('nav.analytics'), path: '/analytics', allowed: isAdminView && isHrAdmin },

    { icon: <FileText size={20} />, label: t('nav.documents'), path: '/documents', allowed: true },
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

      <nav className="flex flex-col gap-1 flex-grow p-4 overflow-y-auto no-scrollbar">
        <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2">{t('nav.menu')}</p>
        {navItems.filter(item => item.allowed).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group ${isActive
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {item.icon}
            <span className="text-sm font-medium">{item.label}</span>
            {item.path === '/leave-requests' && hasPendingLeaves && (
              <span className="w-2 h-2 rounded-full bg-red-500 ml-auto shrink-0" />
            )}
            {item.path === '/expenses' && hasPendingExpenses && (
              <span className="w-2 h-2 rounded-full bg-red-500 ml-auto shrink-0" />
            )}
            {item.path === '/admin-attendance' && hasPendingWFH && (
              <span className="w-2 h-2 rounded-full bg-red-500 ml-auto shrink-0" />
            )}
          </NavLink>
        ))}
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