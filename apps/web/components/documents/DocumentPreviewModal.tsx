import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, X } from 'lucide-react';
import { DocumentItem } from '../../types';
import { formatDate } from '../../lib/date';
import { getFileIcon, displaySize } from './documentHelpers';

interface DocumentPreviewModalProps {
  previewDoc: DocumentItem;
  previewImageUrl: string | null;
  previewPdfUrl: string | null;
  onClose: () => void;
  handleDownload: (e: React.MouseEvent, docId: string) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  previewDoc,
  previewImageUrl,
  previewPdfUrl,
  onClose,
  handleDownload,
}) => {
  const { t } = useTranslation(['documents', 'common']);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-card-dark rounded-xl shadow-2xl border border-border-light dark:border-border-dark w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            {getFileIcon(previewDoc.type)}
            <div>
              <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                {previewDoc.name}
              </h3>
              <p className="text-xs text-text-muted-light">
                {displaySize(previewDoc.size)} • {formatDate(previewDoc.lastAccessed)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => handleDownload(e, previewDoc.id)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Download size={16} /> {t('actions.download')}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-text-muted-light hover:text-text-light dark:hover:text-text-dark hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-8 overflow-auto">
          {/* Preview Content */}
          {['JPG', 'PNG', 'JPEG', 'GIF'].includes(previewDoc.type) ? (
            <div className="relative shadow-lg">
              {previewImageUrl ? (
                <img
                  src={previewImageUrl}
                  alt={t('preview.previewAlt')}
                  className="max-w-full max-h-full rounded-lg"
                />
              ) : (
                <div className="flex items-center justify-center h-64 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
          ) : previewDoc.type === 'PDF' ? (
            previewPdfUrl ? (
              <iframe
                src={previewPdfUrl}
                className="w-full h-full rounded-lg bg-white"
                title={t('preview.pdfPreview')}
              />
            ) : (
              <div className="flex items-center justify-center h-64 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )
          ) : (
            <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-lg w-full border border-border-light dark:border-border-dark">
              <div className="flex justify-center mb-6">{getFileIcon(previewDoc.type, 64)}</div>
              <h4 className="text-xl font-semibold text-text-light dark:text-text-dark mb-2">
                {t('preview.notAvailable')}
              </h4>
              <p className="text-text-muted-light mb-6">
                {t('preview.notAvailableDesc')}
              </p>
              <button
                onClick={(e) => handleDownload(e, previewDoc.id)}
                className="px-6 py-2.5 border border-border-light dark:border-border-dark rounded-lg font-medium text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('preview.downloadFile')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
