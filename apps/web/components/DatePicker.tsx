import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
  minDate?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
  label,
  minDate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize current month from value if provided
  useEffect(() => {
    if (value) {
      setCurrentMonth(new Date(value));
    }
  }, [value]);

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatDisplayDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
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

    // Check if date is before minDate
    if (minDate && dateString < minDate) return;

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
    if (!minDate) return false;
    return formatDate(date) < minDate;
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark text-left flex items-center justify-between hover:border-primary/50 transition-colors"
      >
        <span className={value ? '' : 'text-text-muted-light dark:text-text-muted-dark'}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        <Calendar size={16} className="text-text-muted-light" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg shadow-xl p-4 min-w-[280px]">
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
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="text-xs font-medium text-text-muted-light hover:text-text-light dark:hover:text-text-dark"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
