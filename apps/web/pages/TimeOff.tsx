import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Plus } from 'lucide-react';
import { useLeave } from '../contexts/LeaveContext';
import { useAuth } from '../contexts/AuthContext';
import { LeaveRequest } from '../types';
import { Toast } from '../components/Toast';

export const TimeOff: React.FC = () => {
  const { user } = useAuth();
  const { requests, addRequest, getLeaveBalance } = useLeave();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    show: false, message: '', type: 'success'
  });
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ show: true, message, type });
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  // Disabling exhaustive-deps because getLeaveBalance dependency might cause loops if not memoized,
  // but usually it's stable in context. Safer to include it or suppress.

  const [balances, setBalances] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      getLeaveBalance(user.id).then(setBalances);
    }
  }, [user?.id]);

  // Filter requests for the current user
  const myRequests = requests.filter(r => r.employeeName === user?.name);

  const [leaveForm, setLeaveForm] = useState({
    type: 'Vacation',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const handleSubmit = () => {
    if (!leaveForm.startDate || !leaveForm.endDate) {
      showToast("Please select both start and end dates.", "warning");
      return;
    }

    const start = new Date(leaveForm.startDate);
    const end = new Date(leaveForm.endDate);

    if (end < start) {
      showToast("End date must be after start date.", "warning");
      return;
    }

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const dateString = `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;

    // Calculate days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const newRequest: LeaveRequest = {
      id: Date.now().toString(),
      employeeId: user?.id || '',
      employeeName: user?.name || 'Unknown',
      type: leaveForm.type,
      dates: dateString,
      days: diffDays,
      status: 'Pending',
      avatar: user?.avatar || '',
      // Pass extra fields for API
      // @ts-ignore
      startDate: leaveForm.startDate,
      // @ts-ignore
      endDate: leaveForm.endDate,
      // @ts-ignore
      reason: leaveForm.reason
    };

    addRequest(newRequest);
    setIsModalOpen(false);
    setLeaveForm({ type: 'Vacation', startDate: '', endDate: '', reason: '' });
    showToast(`Leave request submitted for ${diffDays} day(s)!`, 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">Time Off</h1>
          <p className="text-text-muted-light dark:text-text-muted-dark">Manage your leave requests and view balance history.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-lg shadow-sm hover:bg-primary/90 transition-colors"
        >
          <Plus size={18} /> New Request
        </button>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {balances.map((balance) => (
          <div key={balance.type} className="p-6 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg 
                  ${balance.type === 'Vacation' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600' :
                  balance.type === 'Sick Leave' ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-600' : 'bg-purple-100 dark:bg-purple-900/20 text-purple-600'}`}>
                {balance.type === 'Vacation' ? <Calendar size={24} /> :
                  balance.type === 'Sick Leave' ? <AlertCircle size={24} /> : <Clock size={24} />}
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded 
                  ${balance.type === 'Vacation' ? 'bg-blue-50 dark:bg-blue-900/10 text-blue-600' :
                  balance.type === 'Sick Leave' ? 'bg-orange-50 dark:bg-orange-900/10 text-orange-600' : 'bg-purple-50 dark:bg-purple-900/10 text-purple-600'}`}>
                {balance.total === Infinity ? 'Unlimited' : `${balance.remaining} Days Left`}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-text-light dark:text-text-dark">{balance.type}</h3>
            <p className="text-xs text-text-muted-light mt-1">
              {balance.total === Infinity ? 'Requires Approval' : `Total ${balance.total} days / year`}
            </p>
          </div>
        ))}
      </div>

      {/* History Table */}
      <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-border-light dark:border-border-dark">
          <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Request History</h2>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-text-muted-light font-semibold">
              <tr>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {myRequests.length > 0 ? (
                myRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-6 py-4 font-medium text-text-light dark:text-text-dark">{req.type}</td>
                    <td className="px-6 py-4 text-text-muted-light dark:text-text-muted-dark">{req.dates}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${req.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                        req.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}>
                        {req.status === 'Approved' && <CheckCircle2 size={12} />}
                        {req.status === 'Rejected' && <XCircle size={12} />}
                        {req.status === 'Pending' && <Clock size={12} />}
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-text-muted-light">No leave history found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-3">
          {myRequests.length > 0 ? (
            myRequests.map((req) => (
              <div key={req.id} className="bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {req.type === 'Vacation' ? <Calendar size={20} className="text-blue-600" /> :
                      req.type === 'Sick Leave' ? <AlertCircle size={20} className="text-orange-600" /> :
                        <Clock size={20} className="text-purple-600" />}
                    <h3 className="font-medium text-text-light dark:text-text-dark">{req.type}</h3>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${req.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                    req.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                    {req.status === 'Approved' && <CheckCircle2 size={12} />}
                    {req.status === 'Rejected' && <XCircle size={12} />}
                    {req.status === 'Pending' && <Clock size={12} />}
                    {req.status}
                  </span>
                </div>
                <div className="text-sm text-text-muted-light dark:text-text-muted-dark">
                  <span className="font-medium">Dates:</span> {req.dates}
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-text-muted-light">No leave history found.</div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="p-6 space-y-4">
              <h3 className="font-bold text-lg text-text-light dark:text-text-dark mb-4">Request Time Off</h3>
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Type</label>
                <select
                  value={leaveForm.type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark"
                >
                  <option value="Vacation">Vacation</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Personal Day">Personal Day</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Start</label>
                  <input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">End</label>
                  <input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Reason</label>
                <textarea
                  rows={3}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm resize-none text-text-light dark:text-text-dark"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-text-muted-light hover:text-text-light dark:hover:text-text-dark transition-colors">Cancel</button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">Submit</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
};