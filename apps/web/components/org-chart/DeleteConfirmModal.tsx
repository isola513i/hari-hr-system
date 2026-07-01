import React from 'react';
import { createPortal } from 'react-dom';
import type { TFunction } from 'i18next';
import { Trash2 } from 'lucide-react';

export interface DeleteConfirmModalProps {
  t: TFunction;
  onCancel: () => void;
  onConfirm: () => void;
}

// Delete Confirmation Modal
export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ t, onCancel, onConfirm }) => {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Trash2 className="text-red-600 dark:text-red-400" size={24} />
          </div>
          <h3 className="font-bold text-lg text-text-light dark:text-text-dark mb-2">
            {t('orgChart.removeFromOrgChart')}
          </h3>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
            {t('orgChart.removeConfirm')}
          </p>
        </div>
        <div className="flex justify-center gap-3 p-4 border-t border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light transition-colors"
          >
            {t('common:buttons.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <Trash2 size={16} /> {t('common:buttons.delete')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
