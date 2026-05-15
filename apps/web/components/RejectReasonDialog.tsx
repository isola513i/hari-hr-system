import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';

interface RejectReasonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  employeeName?: string;
}

export const RejectReasonDialog: React.FC<RejectReasonDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  employeeName,
}) => {
  const { t } = useTranslation(['leave']);
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('leave:rejectDialog.title')} maxWidth="sm">
      <div className="p-6 space-y-4">
        {employeeName && (
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
            {t('leave:rejectDialog.explanation', { name: employeeName })}
          </p>
        )}
        <div>
          <label htmlFor="rejectReason" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">
            {t('leave:rejectDialog.label')} <span className="text-red-500">*</span>
          </label>
          <textarea
            id="rejectReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('leave:rejectDialog.placeholder')}
            rows={3}
            className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-muted-light focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none transition-colors"
            autoFocus
          />
        </div>
      </div>
      <div className="px-6 py-4 border-t border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
        <button
          onClick={handleClose}
          className="px-5 py-2.5 bg-white dark:bg-card-dark border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
        >
          {t('leave:rejectDialog.cancel')}
        </button>
        <button
          onClick={handleConfirm}
          disabled={!reason.trim()}
          aria-label="Confirm rejection"
          className="px-5 py-2.5 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-700 dark:hover:bg-red-600 active:bg-red-800 dark:active:bg-red-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
        >
          {t('leave:rejectDialog.reject')}
        </button>
      </div>
    </Modal>
  );
};
