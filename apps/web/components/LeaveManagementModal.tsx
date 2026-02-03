import React from 'react';
import { Check, X, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal';
import { LeaveRequest } from '../types';

/**
 * Props for LeaveManagementModal component
 */
interface LeaveManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingRequests: LeaveRequest[];
  onApprove: (requestId: string) => void;
  onDecline: (requestId: string) => void;
}

/**
 * Modal component for managing employee leave requests
 *
 * Features:
 * - Displays all pending leave requests in a table
 * - Quick approve/decline actions for each request
 * - Empty state when no pending requests
 * - Shows employee avatar, name, leave type, and dates
 *
 * @param props - Component props
 */
export const LeaveManagementModal: React.FC<LeaveManagementModalProps> = ({
  isOpen,
  onClose,
  pendingRequests,
  onApprove,
  onDecline
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Leave Requests"
      maxWidth="xl"
    >
      <div className="p-0 overflow-y-auto max-h-[60vh]">
        {pendingRequests.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-background-light dark:bg-background-dark text-xs uppercase text-text-muted-light font-semibold">
              <tr>
                <th className="px-6 py-3">Employee</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Dates</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {pendingRequests.map((request) => (
                <tr key={request.id}>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <img
                        src={request.avatar}
                        alt={request.employeeName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span className="font-medium text-text-light dark:text-text-dark">
                        {request.employeeName}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-text-muted-light dark:text-text-muted-dark">
                    {request.type}
                  </td>
                  <td className="py-4 px-6 text-text-muted-light dark:text-text-muted-dark">
                    {request.dates}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onApprove(request.id)}
                        className="p-2 text-accent-green bg-accent-green/10 rounded-full hover:bg-accent-green/20 transition-colors"
                        title="Approve"
                        aria-label={`Approve leave request for ${request.employeeName}`}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => onDecline(request.id)}
                        className="p-2 text-accent-red bg-accent-red/10 rounded-full hover:bg-accent-red/20 transition-colors"
                        title="Decline"
                        aria-label={`Decline leave request for ${request.employeeName}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-text-muted-light dark:text-text-muted-dark">
            <CheckCircle2 size={48} className="mx-auto mb-4 text-accent-green opacity-50" />
            <p className="text-lg font-medium">No pending requests</p>
            <p className="text-sm">You've cleared the queue!</p>
          </div>
        )}
      </div>
      <div className="px-6 py-4 border-t border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800/50 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  );
};
