import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, UploadCloud, X } from 'lucide-react';
import { Dropdown } from '../Dropdown';
import { useModalA11y } from '../../hooks/useModalA11y';

interface UploadModalProps {
  onClose: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  selectedFile: File | null;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadCategory: string;
  setUploadCategory: (value: string) => void;
  handleUpload: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  onClose,
  fileInputRef,
  selectedFile,
  handleFileSelect,
  uploadCategory,
  setUploadCategory,
  handleUpload,
}) => {
  const { t } = useTranslation(['documents', 'common']);
  const dialogRef = useModalA11y(true, onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) {onClose();} }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
        className="bg-white dark:bg-card-dark rounded-xl shadow-2xl border border-border-light dark:border-border-dark w-full max-w-md overflow-hidden"
      >
        <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
          <h3 id="upload-modal-title" className="font-bold text-lg text-text-light dark:text-text-dark">
            {t('upload.title')}
          </h3>
          <button
            onClick={onClose}
            aria-label={t('common:buttons.close')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* File Input Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border-light dark:border-border-dark rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
            />
            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <FileText size={48} className="text-primary" />
                <p className="text-sm font-medium text-text-light dark:text-text-dark">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-text-muted-light">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <UploadCloud size={48} className="text-text-muted-light" />
                <p className="text-sm text-text-light dark:text-text-dark">
                  {t('upload.dragDrop')}
                </p>
                <p className="text-xs text-text-muted-light">
                  {t('upload.hint')}
                </p>
              </div>
            )}
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
              {t('upload.category')}
            </label>
            <Dropdown
              id="upload-category"
              name="category"
              value={uploadCategory}
              onChange={(value) => setUploadCategory(value)}
              options={[
                { value: 'HR', label: t('categories.hr') },
                { value: 'Contracts', label: t('categories.contracts') },
                { value: 'Policies', label: t('categories.policies') },
                { value: 'Finance', label: t('categories.finance') },
                { value: 'Personal', label: t('categories.personal') },
              ]}
              placeholder={t('common:placeholders.selectCategory')}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-4 border-t border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light transition-colors"
          >
            {t('upload.cancel')}
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('upload.upload')}
          </button>
        </div>
      </div>
    </div>
  );
};
