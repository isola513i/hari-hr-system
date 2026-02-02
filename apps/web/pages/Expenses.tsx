import React from 'react';
import { DollarSign, Plus, FileText, Clock } from 'lucide-react';

export const Expenses: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
            Expense Management
          </h1>
          <p className="text-text-muted-light dark:text-text-muted-dark mt-1">
            Submit and track your expense reports
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary/90 transition-colors">
          <Plus size={18} />
          New Expense
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-lg">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm">
                Total Reimbursed
              </p>
              <p className="text-2xl font-bold text-text-light dark:text-text-dark">
                $1,250.00
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 rounded-lg">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm">
                Pending Approval
              </p>
              <p className="text-2xl font-bold text-text-light dark:text-text-dark">
                $350.00
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-lg">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm">
                This Month
              </p>
              <p className="text-2xl font-bold text-text-light dark:text-text-dark">
                3 Reports
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State / Coming Soon */}
      <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-12 shadow-sm">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <DollarSign size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
            Expense Tracking Coming Soon
          </h3>
          <p className="text-text-muted-light dark:text-text-muted-dark max-w-md mx-auto">
            We're working on a comprehensive expense management system. You'll be able to
            submit receipts, track reimbursements, and manage your expense reports all in one place.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
