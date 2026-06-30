import React, { useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  required?: boolean;
  error?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  value,
  onChange,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSizeMB = 10,
  label,
  required = false,
  error,
}) => {
  const { t } = useTranslation('common');
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState('');

  const displayError = error || localError;

  const validateFile = useCallback(
    (file: File): string | null => {
      // Size check
      if (file.size > maxSizeMB * 1024 * 1024) {
        return t('fileUpload.sizeExceeds', { max: maxSizeMB });
      }
      // Type check
      const allowedExts = accept.split(',').map((e) => e.trim().toLowerCase());
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedExts.includes(ext)) {
        return t('fileUpload.invalidType', { accept });
      }
      return null;
    },
    [accept, maxSizeMB, t],
  );

  const handleFile = useCallback(
    (file: File) => {
      const err = validateFile(file);
      if (err) {
        setLocalError(err);
        return;
      }
      setLocalError('');
      onChange(file);
    },
    [validateFile, onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  const handleRemove = () => {
    onChange(null);
    setLocalError('');
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {value ? (
        /* File preview */
        <div className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <FileText size={18} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">{value.name}</p>
            <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{formatSize(value.size)}</p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="p-1 text-text-muted-light hover:text-red-500 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        /* Drop zone */
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center gap-2 p-5 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            dragOver
              ? 'border-primary bg-primary/5'
              : displayError
                ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10'
                : 'border-border-light dark:border-border-dark hover:border-primary/50 bg-background-light dark:bg-background-dark'
          }`}
        >
          <Upload size={20} className={dragOver ? 'text-primary' : 'text-text-muted-light dark:text-text-muted-dark'} />
          <div className="text-center">
            <p className="text-sm text-text-light dark:text-text-dark">
              <span className="font-medium text-primary">{t('fileUpload.clickToUpload')}</span> {t('fileUpload.orDragAndDrop')}
            </p>
            <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">
              {t('fileUpload.fileTypeHint', { max: maxSizeMB })}
            </p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {displayError && (
        <p className="flex items-center gap-1 mt-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={12} /> {displayError}
        </p>
      )}
    </div>
  );
};
