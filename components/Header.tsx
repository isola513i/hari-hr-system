import React, { useEffect, useState } from 'react';
import { Search, Bell, Moon, Sun, ChevronDown, LogOut, User as UserIcon, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, switchRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <header className="h-16 bg-card-light dark:bg-card-dark border-b border-border-light dark:border-border-dark flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm">
      {/* Search */}
      <div className="w-96 hidden md:block">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark group-focus-within:text-primary transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search employees, documents, policies..."
            className="w-full pl-10 pr-4 py-2 bg-background-light dark:bg-background-dark border border-transparent focus:border-primary/30 rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        
        {/* Role Switcher for Demo */}
        <div className="hidden md:flex items-center bg-background-light dark:bg-background-dark rounded-lg p-1 border border-border-light dark:border-border-dark">
            <button 
                onClick={() => switchRole('HR_ADMIN')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${user.role === 'HR_ADMIN' ? 'bg-primary text-white shadow-sm' : 'text-text-muted-light hover:text-text-light'}`}
            >
                Admin View
            </button>
             <button 
                onClick={() => switchRole('EMPLOYEE')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${user.role === 'EMPLOYEE' ? 'bg-accent-teal text-white shadow-sm' : 'text-text-muted-light hover:text-text-light'}`}
            >
                Employee View
            </button>
        </div>

        <button 
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-full hover:bg-background-light dark:hover:bg-background-dark text-text-muted-light dark:text-text-muted-dark transition-colors"
          title="Toggle Theme"
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        <button className="relative p-2 rounded-full hover:bg-background-light dark:hover:bg-background-dark text-text-muted-light dark:text-text-muted-dark transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-red rounded-full ring-2 ring-card-light dark:ring-card-dark"></span>
        </button>

        <div className="h-8 w-px bg-border-light dark:bg-border-dark mx-2"></div>

        <div className="relative">
            <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 hover:bg-background-light dark:hover:bg-background-dark p-1.5 rounded-lg transition-colors"
            >
              <img 
                src={user.avatar} 
                alt="User" 
                className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20"
              />
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold text-text-light dark:text-text-dark leading-none">{user.name}</p>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1 flex items-center gap-1">
                    {user.role === 'HR_ADMIN' && <Shield size={10} className="text-primary"/>}
                    {user.jobTitle}
                </p>
              </div>
              <ChevronDown size={14} className="text-text-muted-light" />
            </button>

            {isProfileOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-2 border-b border-border-light dark:border-border-dark md:hidden">
                        <p className="text-xs font-semibold text-text-muted-light uppercase mb-1">Switch View</p>
                         <button 
                            onClick={() => { switchRole('HR_ADMIN'); setIsProfileOpen(false); }}
                            className={`w-full text-left text-sm py-1 ${user.role === 'HR_ADMIN' ? 'text-primary font-bold' : 'text-text-light dark:text-text-dark'}`}
                        >
                            Admin
                        </button>
                        <button 
                            onClick={() => { switchRole('EMPLOYEE'); setIsProfileOpen(false); }}
                             className={`w-full text-left text-sm py-1 ${user.role === 'EMPLOYEE' ? 'text-accent-teal font-bold' : 'text-text-light dark:text-text-dark'}`}
                        >
                            Employee
                        </button>
                    </div>
                    <button 
                        onClick={() => {
                            navigate(`/employees/${user.id}`);
                            setIsProfileOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark flex items-center gap-2"
                    >
                        <UserIcon size={16} /> Profile
                    </button>
                     <button className="w-full text-left px-4 py-2 text-sm text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark flex items-center gap-2">
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            )}
        </div>
      </div>
    </header>
  );
};