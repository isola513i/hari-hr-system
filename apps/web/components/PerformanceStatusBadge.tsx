import React, { useState } from 'react';
import { Clock, ThumbsUp, CheckCircle, XCircle, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const STATUS_COLOR: Record<string, string> = {
  draft:            'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400',
  submitted:        'bg-accent-orange/10 text-accent-orange',
  manager_reviewed: 'bg-primary/10 text-primary',
  completed:        'bg-accent-green/10 text-accent-green',
  rejected:         'bg-accent-red/10 text-accent-red',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  draft:            <Clock size={12} />,
  submitted:        <Clock size={12} />,
  manager_reviewed: <ThumbsUp size={12} />,
  completed:        <CheckCircle size={12} />,
  rejected:         <XCircle size={12} />,
};

export function PerformanceStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation(['performance-reviews']);
  const color = STATUS_COLOR[status] ?? STATUS_COLOR['draft'];
  const icon = STATUS_ICON[status] ?? STATUS_ICON['draft'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {icon} {t(`status.${status}`, status)}
    </span>
  );
}

export function StarRating({
  value,
  onChange,
  readonly,
}: {
  value: number | null;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <Star
            size={20}
            className={
              s <= (hover || value || 0)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            }
          />
        </button>
      ))}
    </div>
  );
}
