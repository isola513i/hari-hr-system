import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div
    className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    aria-hidden="true"
  />
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 ${className}`}>
    <div className="flex items-center gap-3 mb-3">
      <Skeleton className="w-10 h-10 rounded-lg" />
      <Skeleton className="h-4 w-24" />
    </div>
    <Skeleton className="h-7 w-16 mb-1" />
    <Skeleton className="h-3 w-20" />
  </div>
);

export const SkeletonRow: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-3 py-3 ${className}`}>
    <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
    <Skeleton className="h-6 w-16 rounded-full" />
  </div>
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} />
    ))}
  </div>
);
