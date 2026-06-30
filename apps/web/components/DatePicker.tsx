import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
  minDate?: string;
  maxDate?: string;
  /** Set of individual "YYYY-MM-DD" strings that cannot be selected (e.g. public holidays). */
  disabledDates?: Set<string>;
  /** Weekday numbers (0=Sun … 6=Sat) that cannot be selected (e.g. an employee's days off). */
  disabledWeekdays?: number[];
  disabled?: boolean;
}

/**
 * Custom DatePicker Component
 *
 * A consistent date picker that displays in English regardless of system locale.
 * Uses React Portal to render calendar outside parent containers (works in modals).
 *
 * Features:
 * - Custom calendar UI in English
 * - Month/year navigation
 * - Keyboard support (Escape to close)
 * - Click outside to close
 * - Portal-based rendering for modal compatibility
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder: placeholderProp,
  label,
  minDate,
  maxDate,
  disabledDates,
  disabledWeekdays,
  disabled = false
}) => {
  const { t, i18n } = useTranslation('common');
  const placeholder = placeholderProp ?? t('placeholders.selectDate');
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const monthNames = [
    t('months.january'), t('months.february'), t('months.march'),
    t('months.april'), t('months.may'), t('months.june'),
    t('months.july'), t('months.august'), t('months.september'),
    t('months.october'), t('months.november'), t('months.december')
  ];

  const dayNames = [
    t('weekdaysShort.sun'), t('weekdaysShort.mon'), t('weekdaysShort.tue'),
    t('weekdaysShort.wed'), t('weekdaysShort.thu'), t('weekdaysShort.fri'),
    t('weekdaysShort.sat')
  ];

  // Calculate position and open calendar
  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const calendarWidth = 280;
      const calendarHeight = 340;
      const edgePadding = 12; // min distance from viewport edges

      // Check if calendar would go off the right edge
      let left = rect.left + window.scrollX;
      if (left + calendarWidth > window.innerWidth - edgePadding) {
        left = rect.right + window.scrollX - calendarWidth;
      }
      // Clamp to never go past the left edge
      if (left < edgePadding + window.scrollX) {
        left = edgePadding + window.scrollX;
      }

      // Check if calendar would go off the bottom edge
      let top = rect.bottom + window.scrollY + 8;
      if (rect.bottom + calendarHeight > window.innerHeight - edgePadding) {
        top = rect.top + window.scrollY - calendarHeight - 8;
      }

      setMenuPosition({ top, left });
    }
    setIsOpen(!isOpen);
  };

  // Reset position when closed
  useEffect(() => {
    if (!isOpen) {
      setMenuPosition(null);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        calendarRef.current && !calendarRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Initialize current month from value if provided
  useEffect(() => {
    if (value) {
      setCurrentMonth(new Date(value));
    }
  }, [value]);

  const formatDate = (date: Date): string => {
    // Use local timezone instead of UTC to avoid date shifting
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === 'th' ? 'th-TH' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: Date[] = [];

    // Add empty slots for days before the first day of the month
    const firstDayOfWeek = firstDay.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(new Date(0)); // Empty day
    }

    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateClick = (date: Date) => {
    if (date.getTime() === 0) return; // Skip empty days

    const dateString = formatDate(date);

    // Respect min/max bounds, non-working weekdays, and explicitly disabled dates (e.g. holidays)
    if (minDate && dateString < minDate) return;
    if (maxDate && dateString > maxDate) return;
    if (disabledWeekdays?.includes(date.getDay())) return;
    if (disabledDates?.has(dateString)) return;

    onChange(dateString);
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    onChange(formatDate(today));
    setCurrentMonth(today);
    setIsOpen(false);
  };

  const isSelected = (date: Date): boolean => {
    if (!value || date.getTime() === 0) return false;
    return formatDate(date) === value;
  };

  const isToday = (date: Date): boolean => {
    if (date.getTime() === 0) return false;
    const today = new Date();
    return formatDate(date) === formatDate(today);
  };

  const isDisabled = (date: Date): boolean => {
    if (date.getTime() === 0) return true;
    const dateString = formatDate(date);
    if (minDate && dateString < minDate) return true;
    if (maxDate && dateString > maxDate) return true;
    if (disabledWeekdays?.includes(date.getDay())) return true;
    if (disabledDates?.has(dateString)) return true;
    return false;
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark pointer-events-none" />
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className="w-full pl-10 pr-3 py-2 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm text-sm text-text-light dark:text-text-dark text-left hover:border-primary/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border-light dark:disabled:hover:border-border-dark"
        >
          <span className={value ? '' : 'text-text-muted-light dark:text-text-muted-dark'}>
            {value ? formatDisplayDate(value) : placeholder}
          </span>
        </button>
      </div>

      {/* Calendar - rendered via Portal */}
      {isOpen && menuPosition && createPortal(
        <div
          ref={calendarRef}
          style={{
            position: 'absolute',
            top: menuPosition.top,
            left: menuPosition.left,
            zIndex: 99999
          }}
          className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg shadow-xl p-4 min-w-[280px] animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-background-light dark:hover:bg-background-dark rounded transition-colors"
            >
              <ChevronLeft size={20} className="text-text-light dark:text-text-dark" />
            </button>

            <span className="font-semibold text-text-light dark:text-text-dark">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-background-light dark:hover:bg-background-dark rounded transition-colors"
            >
              <ChevronRight size={20} className="text-text-light dark:text-text-dark" />
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div
                key={day}
                className="text-xs font-medium text-text-muted-light dark:text-text-muted-dark text-center p-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {days.map((date, index) => {
              const isEmpty = date.getTime() === 0;
              const selected = isSelected(date);
              const today = isToday(date);
              const disabled = isDisabled(date);

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDateClick(date)}
                  disabled={isEmpty || disabled}
                  className={`
                    p-2 text-sm rounded transition-colors
                    ${isEmpty ? 'invisible' : ''}
                    ${selected ? 'bg-primary text-white font-semibold' : ''}
                    ${!selected && today ? 'border-2 border-primary text-primary font-medium' : ''}
                    ${!selected && !today && !disabled ? 'text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark' : ''}
                    ${disabled ? 'text-text-muted-light/30 dark:text-text-muted-dark/30 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {!isEmpty && date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between items-center pt-3 border-t border-border-light dark:border-border-dark">
            <button
              type="button"
              onClick={handleToday}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t('datePicker.today')}
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="text-xs font-medium text-text-muted-light hover:text-text-light dark:hover:text-text-dark"
            >
              {t('datePicker.clear')}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
