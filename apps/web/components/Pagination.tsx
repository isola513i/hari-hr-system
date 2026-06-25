import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  className = '',
}) => {
  const { t } = useTranslation('common');
  const startItem = totalItems && itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : null;
  const endItem = totalItems && itemsPerPage ? Math.min(currentPage * itemsPerPage, totalItems) : null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      if (totalPages > 1) pages.push(totalPages);
    }
    return pages;
  };

  if (totalPages <= 1) {
    // Single page (or empty): don't render pager controls, but when we know the
    // item count, show a quiet "all on one page" hint instead of silent null.
    if (totalItems && itemsPerPage) {
      return (
        <div className={`flex items-center justify-start ${className}`}>
          <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
            {t('pagination.singlePage', { defaultValue: 'Showing all {{count}} items', count: totalItems })}
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {totalItems && itemsPerPage && (
        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
          {startItem}–{endItem} {t('pagination.of')} {totalItems}
        </p>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </button>

        <div className="flex items-center gap-0.5">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="w-7 text-center text-xs text-text-muted-light dark:text-text-muted-dark">
                  ···
                </span>
              );
            }

            const pageNum = page as number;
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`relative w-7 h-7 text-xs rounded transition-colors ${
                  isActive
                    ? 'text-primary font-semibold'
                    : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {pageNum}
                {isActive && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};
