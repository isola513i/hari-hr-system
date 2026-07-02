import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AvailabilityStatus } from '../types';

interface StatusIndicatorProps {
  status: AvailabilityStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  statusMessage?: string;
  showTooltip?: boolean;
}

const statusColors: Record<AvailabilityStatus, string> = {
  online: 'bg-green-500',
  busy: 'bg-red-500',
  away: 'bg-yellow-500',
  offline: 'bg-gray-400',
};

const sizeClasses = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-3.5 h-3.5',
};

const borderClasses = {
  sm: 'ring-[1.5px]',
  md: 'ring-2',
  lg: 'ring-2',
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  className = '',
  statusMessage,
  showTooltip = false,
}) => {
  const { t } = useTranslation('common');

  const label = t(`availability.${status}`);
  const tooltip = statusMessage ? `${label}: ${statusMessage}` : label;

  return (
    <span
      className={`${sizeClasses[size]} ${statusColors[status]} ${borderClasses[size]} ring-card-light dark:ring-card-dark rounded-full inline-block flex-shrink-0 ${className}`}
      aria-label={tooltip}
      title={showTooltip ? tooltip : undefined}
    />
  );
};
