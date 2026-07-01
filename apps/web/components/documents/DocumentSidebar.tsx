import React from 'react';
import { useTranslation } from 'react-i18next';
import { UploadCloud, HardDrive } from 'lucide-react';

interface DocumentCategory {
  name: string;
  label: string;
  icon: React.ReactNode;
}

interface StorageStats {
  used: number;
  total: number;
  usedFormatted: string;
  totalFormatted: string;
  percentage: number;
}

interface DocumentSidebarProps {
  categories: DocumentCategory[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onUploadClick: () => void;
  storageStats: StorageStats | undefined;
}

export const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
  onUploadClick,
  storageStats,
}) => {
  const { t } = useTranslation(['documents', 'common']);

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-6">
      <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 shadow-sm">
        <button
          onClick={onUploadClick}
          className="w-full py-2.5 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mb-6"
        >
          <UploadCloud size={18} />
          {t('uploadNew')}
        </button>

        <nav className="space-y-1">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => onCategoryChange(cat.name)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === cat.name
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-muted-light dark:text-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-text-light dark:text-text-dark font-semibold">
          <HardDrive size={18} />
          <h3>{t('storage')}</h3>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all ${
              (storageStats?.percentage ?? 0) > 90
                ? 'bg-red-500'
                : (storageStats?.percentage ?? 0) > 70
                  ? 'bg-accent-orange'
                  : 'bg-green-500'
            }`}
            style={{ width: `${storageStats?.percentage ?? 0}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-text-muted-light dark:text-text-muted-dark">
          <span>{t('usedOfTotal', { used: storageStats?.usedFormatted ?? '0 B' })}</span>
          <span>{t('totalStorage', { total: storageStats?.totalFormatted ?? '100 GB' })}</span>
        </div>
      </div>
    </aside>
  );
};
