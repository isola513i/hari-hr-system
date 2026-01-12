import React from 'react';
import { CheckCircle2, AlertCircle, Clock, UserPlus, CheckSquare, FileEdit, Download } from 'lucide-react';
import { COMPLIANCE_ITEMS, AUDIT_LOGS } from '../constants';

export const Compliance: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div className="flex flex-col">
          <h1 className="text-text-light dark:text-text-dark text-3xl font-bold tracking-tight">Compliance & Reporting</h1>
          <p className="text-text-muted-light dark:text-text-muted-dark text-base">Monitor regulatory adherence and generate custom reports.</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark font-medium rounded-lg text-sm border border-border-light dark:border-border-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <Download size={18} />
            Export Data
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-8">
          {/* Compliance Checklist */}
          <section className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark">
            <div className="p-6 border-b border-border-light dark:border-border-dark">
              <h2 className="text-text-light dark:text-text-dark text-xl font-bold tracking-tight">Compliance Checklist</h2>
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm mt-1">Track key regulatory requirements.</p>
            </div>
            <div className="p-6 space-y-4">
              {COMPLIANCE_ITEMS.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-background-light dark:bg-background-dark/50">
                  <div className="flex items-center gap-3">
                    {item.status === 'Complete' && <CheckCircle2 className="text-accent-green" size={20} />}
                    {item.status === 'In Progress' && <Clock className="text-accent-orange" size={20} />}
                    {item.status === 'Overdue' && <AlertCircle className="text-accent-red" size={20} />}
                    <p className="text-text-light dark:text-text-dark font-medium">{item.title}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    item.status === 'Complete' ? 'text-accent-green bg-accent-green/10' :
                    item.status === 'In Progress' ? 'text-accent-orange bg-accent-orange/10' :
                    'text-accent-red bg-accent-red/10'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* HR Audit Log */}
          <section className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark">
            <div className="p-6 border-b border-border-light dark:border-border-dark">
              <h2 className="text-text-light dark:text-text-dark text-xl font-bold tracking-tight">HR Audit Log</h2>
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm mt-1">Recent changes and approvals across the module.</p>
            </div>
            <div className="p-6 space-y-6">
              {AUDIT_LOGS.map((log) => (
                <div key={log.id} className="flex items-start gap-4 relative">
                  <div className={`rounded-full p-2 flex-shrink-0 ${
                      log.type === 'user' ? 'bg-primary/10 text-primary' :
                      log.type === 'leave' ? 'bg-accent-green/10 text-accent-green' :
                      'bg-accent-orange/10 text-accent-orange'
                  }`}>
                      {log.type === 'user' && <UserPlus size={16} />}
                      {log.type === 'leave' && <CheckSquare size={16} />}
                      {log.type === 'policy' && <FileEdit size={16} />}
                  </div>
                  <div>
                    <p className="text-text-light dark:text-text-dark text-sm leading-snug">
                      <span className="font-bold">{log.user}</span> {log.action} <span className="font-bold">{log.target}</span>.
                    </p>
                    <p className="text-text-muted-light dark:text-text-muted-dark text-xs mt-1">{log.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Custom Report Builder */}
        <div className="flex flex-col">
          <section className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark h-full">
            <div className="p-6 border-b border-border-light dark:border-border-dark">
              <h2 className="text-text-light dark:text-text-dark text-xl font-bold tracking-tight">Custom Report Builder</h2>
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm mt-1">Generate reports by selecting data points.</p>
            </div>
            <div className="p-6 flex flex-col">
              <div className="space-y-6 flex-grow">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2" htmlFor="report-name">Report Name</label>
                  <input 
                    className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark placeholder:text-text-muted-light focus:outline-none focus:ring-2 focus:ring-primary" 
                    id="report-name" 
                    placeholder="e.g., Q3 Headcount Analysis" 
                    type="text"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">Data Points</label>
                  <div className="grid grid-cols-2 gap-4">
                    {['Employee Name', 'Salary', 'Department', 'Start Date', 'Performance Rating', 'Leave Balance'].map((point, idx) => (
                       <label key={idx} className="flex items-center space-x-3 cursor-pointer">
                        <input type="checkbox" defaultChecked={idx % 2 === 0} className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary" />
                        <span className="text-text-light dark:text-text-dark text-sm">{point}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2" htmlFor="date-range">Date Range</label>
                  <select className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary" id="date-range">
                    <option>Last 90 Days</option>
                    <option>This Quarter</option>
                    <option>Last Quarter</option>
                    <option>This Year</option>
                  </select>
                </div>
              </div>
              <div className="mt-8">
                <button className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary/90 transition-colors">
                  <FileEdit size={18} />
                  Generate Report
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};