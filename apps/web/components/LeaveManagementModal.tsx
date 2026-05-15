import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal';
import { LeaveRequest } from '../types';
import { translateLeaveType } from '../lib/leaveTypeConfig';

/**
 * Props for LeaveManagementModal component
 */
interface LeaveManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingRequests: LeaveRequest[];
  onApprove: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  onRowClick?: (request: LeaveRequest) => void;
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
  onDecline,
  onRowClick,
}) => {
  const { t } = useTranslation(['leave', 'common']);
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('leave:management.title')}
      maxWidth="xl"
    >
      <div className="p-0">
        {pendingRequests.length > 0 ? (
          <>
            {/* Desktop Table */}
            <table className="w-full text-left text-sm hidden md:table">
              <thead className="bg-background-light dark:bg-background-dark text-xs uppercase text-text-muted-light font-semibold">
                <tr>
                  <th className="px-6 py-3">{t('leave:management.employee')}</th>
                  <th className="px-6 py-3">{t('leave:management.type')}</th>
                  <th className="px-6 py-3">{t('leave:management.dates')}</th>
                  <th className="px-6 py-3 text-right">{t('leave:management.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {pendingRequests.map((request) => (
                  <tr key={request.id} onClick={() => onRowClick?.(request)} className={onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors' : ''}>
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
                      {translateLeaveType(request.type)}
                    </td>
                    <td className="py-4 px-6 text-text-muted-light dark:text-text-muted-dark">
                      {request.dates}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); onApprove(request.id); }}
                          className="p-2 text-accent-green bg-accent-green/10 rounded-full hover:bg-accent-green/20 transition-colors"
                          title={t('leave:management.approve', { defaultValue: 'Approve' })}
                          aria-label={t('leave:management.approveAria', { name: request.employeeName })}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDecline(request.id); }}
                          className="p-2 text-accent-red bg-accent-red/10 rounded-full hover:bg-accent-red/20 transition-colors"
                          title={t('leave:management.decline', { defaultValue: 'Decline' })}
                          aria-label={t('leave:management.declineAria', { name: request.employeeName })}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 p-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  onClick={() => onRowClick?.(request)}
                  className={`bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 ${onRowClick ? 'cursor-pointer active:bg-gray-50 dark:active:bg-gray-800' : ''}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={request.avatar}
                        alt={request.employeeName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span className="font-medium text-sm text-text-light dark:text-text-dark">
                        {request.employeeName}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('leave:management.type')}</p>
                      <p className="text-text-light dark:text-text-dark">{translateLeaveType(request.type)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('leave:management.dates')}</p>
                      <p className="text-text-light dark:text-text-dark">{request.dates}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onApprove(request.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-accent-green bg-accent-green/10 rounded-lg hover:bg-accent-green/20 transition-colors"
                      aria-label={t('leave:management.approveAria', { name: request.employeeName })}
                    >
                      <Check size={16} />
                      {t('leave:management.approve', { defaultValue: 'Approve' })}
                    </button>
                    <button
                      onClick={() => onDecline(request.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-accent-red bg-accent-red/10 rounded-lg hover:bg-accent-red/20 transition-colors"
                      aria-label={t('leave:management.declineAria', { name: request.employeeName })}
                    >
                      <X size={16} />
                      {t('leave:management.decline', { defaultValue: 'Decline' })}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-text-muted-light dark:text-text-muted-dark">
            <CheckCircle2 size={48} className="mx-auto mb-4 text-accent-green opacity-50" />
            <p className="text-lg font-medium">{t('leave:management.noPending')}</p>
            <p className="text-sm">{t('leave:management.clearedQueue')}</p>
          </div>
        )}
      </div>
      <div className="px-6 py-4 border-t border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800/50 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {t('leave:management.close')}
        </button>
      </div>
    </Modal>
  );
};
