import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Share2, Trash2 } from 'lucide-react';
import { DocumentItem } from '../../types';
import { formatDate } from '../../lib/date';
import { getFileIcon, displaySize } from './documentHelpers';

interface DocumentListViewProps {
  documents: DocumentItem[];
  onPreview: (doc: DocumentItem) => void;
  handleDownload: (e: React.MouseEvent, docId: string) => void;
  handleShare: (e: React.MouseEvent, doc: DocumentItem) => void;
  handleDelete: (e: React.MouseEvent, docId: string) => void;
}

export const DocumentListView: React.FC<DocumentListViewProps> = ({
  documents,
  onPreview,
  handleDownload,
  handleShare,
  handleDelete,
}) => {
  const { t } = useTranslation(['documents', 'common']);

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-text-muted-light dark:text-text-muted-dark font-semibold">
            <tr>
              <th className="px-6 py-4">{t('table.name')}</th>
              <th className="px-6 py-4">{t('table.category')}</th>
              <th className="px-6 py-4">{t('table.size')}</th>
              <th className="px-6 py-4">{t('table.owner')}</th>
              <th className="px-6 py-4">{t('table.lastModified')}</th>
              <th className="px-6 py-4 text-right">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light dark:divide-border-dark">
            {documents.map((doc) => (
              <tr
                key={doc.id}
                onClick={() => onPreview(doc)}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group cursor-pointer"
              >
                <td className="px-6 py-3 font-medium text-text-light dark:text-text-dark flex items-center gap-3">
                  {getFileIcon(doc.type)}
                  {doc.name}
                </td>
                <td className="px-6 py-3 text-text-muted-light dark:text-text-muted-dark">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                    {doc.category}
                  </span>
                </td>
                <td className="px-6 py-3 text-text-muted-light dark:text-text-muted-dark font-mono text-xs">
                  {displaySize(doc.size)}
                </td>
                <td className="px-6 py-3 text-text-muted-light dark:text-text-muted-dark">
                  {doc.owner}
                </td>
                <td className="px-6 py-3 text-text-muted-light dark:text-text-muted-dark">
                  {formatDate(doc.lastAccessed)}
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleDownload(e, doc.id)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-text-muted-light hover:text-primary transition-colors"
                      title={t('actions.download')}
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={(e) => handleShare(e, doc)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-text-muted-light hover:text-primary transition-colors"
                      title={t('actions.share')}
                    >
                      <Share2 size={16} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, doc.id)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-text-muted-light hover:text-red-500 transition-colors"
                      title={t('common:buttons.delete')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            onClick={() => onPreview(doc)}
            className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0">{getFileIcon(doc.type, 32)}</div>
              <div className="flex-1 min-w-0">
                <h4
                  className="font-medium text-text-light dark:text-text-dark text-sm mb-1 truncate"
                  title={doc.name}
                >
                  {doc.name}
                </h4>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                  {doc.category}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-text-muted-light dark:text-text-muted-dark mb-3">
              <div>
                <span className="font-medium">{t('card.size')}</span> {displaySize(doc.size)}
              </div>
              <div>
                <span className="font-medium">{t('card.owner')}</span> {doc.owner}
              </div>
              <div className="col-span-2">
                <span className="font-medium">{t('card.modified')}</span> {formatDate(doc.lastAccessed)}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-border-light dark:border-border-dark">
              <button
                onClick={(e) => handleDownload(e, doc.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
              >
                <Download size={14} /> {t('actions.download')}
              </button>
              <button
                onClick={(e) => handleShare(e, doc)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-text-light dark:text-text-dark rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Share2 size={14} /> {t('actions.share')}
              </button>
              <button
                onClick={(e) => handleDelete(e, doc.id)}
                className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                title={t('common:buttons.delete')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
