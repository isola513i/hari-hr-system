import React from 'react';
import { useTranslation } from 'react-i18next';
import { MoreVertical, Download, Share2, Trash2, RotateCcw } from 'lucide-react';
import { DocumentItem } from '../../types';
import { getFileIcon, displaySize } from './documentHelpers';

interface DocumentGridViewProps {
  documents: DocumentItem[];
  selectedCategory: string;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onPreview: (doc: DocumentItem) => void;
  handleDownload: (e: React.MouseEvent, docId: string) => void;
  handleShare: (e: React.MouseEvent, doc: DocumentItem) => void;
  handleDelete: (e: React.MouseEvent, docId: string) => void;
  handleRestore: (e: React.MouseEvent, docId: string) => void;
  handlePermanentDelete: (e: React.MouseEvent, docId: string) => void;
}

export const DocumentGridView: React.FC<DocumentGridViewProps> = ({
  documents,
  selectedCategory,
  openMenuId,
  setOpenMenuId,
  onPreview,
  handleDownload,
  handleShare,
  handleDelete,
  handleRestore,
  handlePermanentDelete,
}) => {
  const { t } = useTranslation(['documents', 'common']);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {documents.map((doc) => (
        <div
          key={doc.id}
          onClick={() => onPreview(doc)}
          className="group bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer relative"
        >
          {/* Menu Button */}
          <div className="absolute top-2 right-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(openMenuId === doc.id ? null : doc.id);
              }}
              className="p-1.5 text-text-muted-light hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
            >
              <MoreVertical size={16} />
            </button>

            {/* Dropdown Menu */}
            {openMenuId === doc.id && (
              <div className="absolute right-0 top-8 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-border-light dark:border-border-dark py-1 z-10">
                {selectedCategory === 'Trash' ? (
                  <>
                    <button
                      onClick={(e) => {
                        handleRestore(e, doc.id);
                        setOpenMenuId(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2"
                    >
                      <RotateCcw size={14} /> {t('actions.restore')}
                    </button>
                    <button
                      onClick={(e) => {
                        handlePermanentDelete(e, doc.id);
                        setOpenMenuId(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <Trash2 size={14} /> {t('actions.deletePermanently')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={(e) => {
                        handleDownload(e, doc.id);
                        setOpenMenuId(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Download size={14} /> {t('actions.download')}
                    </button>
                    <button
                      onClick={(e) => {
                        handleShare(e, doc);
                        setOpenMenuId(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Share2 size={14} /> {t('actions.share')}
                    </button>
                    <button
                      onClick={(e) => {
                        handleDelete(e, doc.id);
                        setOpenMenuId(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <Trash2 size={14} /> {t('actions.moveToTrash')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="h-24 flex items-center justify-center bg-white dark:bg-card-dark rounded-lg mb-3">
            {getFileIcon(doc.type)}
          </div>
          <div className="min-w-0">
            <h4
              className="font-medium text-text-light dark:text-text-dark text-sm truncate mb-1"
              title={doc.name}
            >
              {doc.name}
            </h4>
            <p className="text-xs text-text-muted-light dark:text-text-muted-dark truncate">
              {displaySize(doc.size)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
