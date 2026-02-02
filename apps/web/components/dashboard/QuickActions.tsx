import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Palmtree, DollarSign, MessageSquare, Clock } from 'lucide-react';

interface QuickActionsProps {
  isAdmin?: boolean;
  onAddEmployee?: () => void;
  onViewLeaveRequests?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  isAdmin = false,
  onAddEmployee,
  onViewLeaveRequests,
}) => {
  const navigate = useNavigate();

  if (isAdmin) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={onAddEmployee}
          className="flex items-center justify-center gap-3 p-4 bg-primary text-white rounded-xl shadow-sm hover:bg-primary/90 transition-all"
        >
          <Clock size={20} />
          <span className="font-medium">Add Employee</span>
        </button>
        <button
          onClick={onViewLeaveRequests}
          className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 transition-all"
        >
          <Palmtree size={20} className="text-accent-teal" />
          <span className="font-medium text-text-light dark:text-text-dark">Leave Requests</span>
        </button>
        <button
          onClick={() => navigate('/employees')}
          className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 transition-all"
        >
          <DollarSign size={20} className="text-accent-green" />
          <span className="font-medium text-text-light dark:text-text-dark">View Employees</span>
        </button>
        <button
          onClick={() => navigate('/analytics')}
          className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 transition-all"
        >
          <MessageSquare size={20} className="text-accent-orange" />
          <span className="font-medium text-text-light dark:text-text-dark">Analytics</span>
        </button>
      </div>
    );
  }

  // Employee quick actions
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <button
        onClick={() => navigate('/time-off')}
        className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
      >
        <div className="p-2 bg-accent-teal/10 text-accent-teal rounded-lg group-hover:bg-accent-teal group-hover:text-white transition-colors">
          <Palmtree size={20} />
        </div>
        <span className="font-medium text-text-light dark:text-text-dark">Time Off</span>
      </button>
      <button
        onClick={() => navigate('/expenses')}
        className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
      >
        <div className="p-2 bg-accent-green/10 text-accent-green rounded-lg group-hover:bg-accent-green group-hover:text-white transition-colors">
          <DollarSign size={20} />
        </div>
        <span className="font-medium text-text-light dark:text-text-dark">Expenses</span>
      </button>
      <button
        onClick={() => navigate('/surveys')}
        className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
      >
        <div className="p-2 bg-accent-orange/10 text-accent-orange rounded-lg group-hover:bg-accent-orange group-hover:text-white transition-colors">
          <MessageSquare size={20} />
        </div>
        <span className="font-medium text-text-light dark:text-text-dark">Surveys</span>
      </button>
    </div>
  );
};
