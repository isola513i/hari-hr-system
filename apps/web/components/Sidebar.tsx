import React from 'react';
import { NavLink } from 'react-router-dom';
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
  Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'HR_ADMIN';

  // Define nav items based on role
  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/', allowed: true },

    // Employee Focused Tools
    { icon: <Clock size={20} />, label: 'Attendance', path: '/attendance', allowed: !isAdmin },
    { icon: <Calendar size={20} />, label: 'Time Off', path: '/time-off', allowed: !isAdmin },
    { icon: <DollarSign size={20} />, label: 'Expenses', path: '/expenses', allowed: false }, // Hidden - not yet implemented
    { icon: <MessageSquare size={20} />, label: 'Surveys', path: '/surveys', allowed: !isAdmin },

    { icon: <Smile size={20} />, label: 'Well-being', path: '/wellbeing', allowed: true },
    { icon: <Users size={20} />, label: 'Employees', path: '/employees', allowed: true },
    { icon: <GitGraph size={20} />, label: 'Org Chart', path: '/org-chart', allowed: true },
    { icon: <ClipboardList size={20} />, label: 'Onboarding', path: '/onboarding', allowed: true },

    // Admin Specific
    { icon: <ShieldCheck size={20} />, label: 'Compliance', path: '/compliance', allowed: isAdmin },
    { icon: <BarChart2 size={20} />, label: 'Analytics', path: '/analytics', allowed: isAdmin },

    { icon: <FileText size={20} />, label: 'Documents', path: '/documents', allowed: true },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-primary-dark text-white flex flex-col h-full shadow-xl">
      <div className="p-6 pb-8 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="aspect-square w-10 h-10 rounded-lg overflow-hidden shadow-lg bg-white flex items-center justify-center">
            <img
              src="/logo/AIYA_Logo.png"
              alt="AIYA Logo"
              className="w-full h-full object-contain p-1"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-white text-base font-bold leading-tight">HARI</h1>
            <p className="text-gray-400 text-xs font-medium">by AIYA • {isAdmin ? 'Admin' : 'Employee'}</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 flex-grow p-4 overflow-y-auto">
        <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2">Menu</p>
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
            <span className="text-sm font-medium">Settings</span>
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
            <span className="text-sm font-medium">Help & Support</span>
          </NavLink>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-colors mt-2 text-left"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};