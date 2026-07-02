import React from 'react';
import { useTranslation } from 'react-i18next';

interface WorkDaysSelectorProps {
  /** Selected weekday numbers (0=Sun … 6=Sat). */
  value: number[];
  onChange: (days: number[]) => void;
  disabled?: boolean;
}

// Monday-first display order, mapped to JS weekday numbers (0=Sun … 6=Sat)
const DAYS: { num: number; key: string }[] = [
  { num: 1, key: 'mon' },
  { num: 2, key: 'tue' },
  { num: 3, key: 'wed' },
  { num: 4, key: 'thu' },
  { num: 5, key: 'fri' },
  { num: 6, key: 'sat' },
  { num: 0, key: 'sun' },
];

/**
 * A row of weekday toggles for configuring which days an employee works.
 * Reuses the shared `common:weekdaysShort.*` labels so it follows the UI language.
 */
export const WorkDaysSelector: React.FC<WorkDaysSelectorProps> = ({ value, onChange, disabled = false }) => {
  const { t } = useTranslation('common');

  const toggle = (num: number) => {
    if (disabled) return;
    const next = value.includes(num) ? value.filter((d) => d !== num) : [...value, num];
    onChange([...next].sort((a, b) => a - b));
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {DAYS.map(({ num, key }) => {
        const active = value.includes(num);
        return (
          <button
            key={num}
            type="button"
            onClick={() => toggle(num)}
            disabled={disabled}
            aria-pressed={active}
            className={`min-w-[40px] min-h-[40px] px-2.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              active
                ? 'bg-primary text-white border-primary'
                : 'bg-card-light dark:bg-card-dark text-text-muted-light dark:text-text-muted-dark border-border-light dark:border-border-dark hover:border-primary/40'
            }`}
          >
            {t(`weekdaysShort.${key}`)}
          </button>
        );
      })}
    </div>
  );
};
