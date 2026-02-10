import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  width?: string;
  id?: string;
  name?: string;
}

/**
 * Custom Dropdown Component
 *
 * A consistent dropdown component that works the same across all browsers.
 * Uses React Portal to render menu outside parent containers (works in modals).
 *
 * Features:
 * - Custom styling that looks the same everywhere
 * - Keyboard navigation support
 * - Click outside to close
 * - Visual indicator for selected option
 * - Portal-based rendering for modal compatibility
 */
export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className = '',
  width = 'w-full',
  id,
  name
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Get the label for the currently selected value
  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  // Calculate position and open dropdown
  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
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
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${width} ${className}`}>
      {/* Dropdown Button */}
      <button
        ref={buttonRef}
        type="button"
        id={id}
        name={name}
        onClick={handleToggle}
        className="w-full flex items-center justify-between pl-4 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer text-text-light dark:text-text-dark hover:border-primary/50"
      >
        <span className={selectedOption ? '' : 'text-text-muted-light'}>
          {displayLabel}
        </span>
        <ChevronDown
          size={16}
          className={`text-text-muted-light transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu - rendered via Portal */}
      {isOpen && menuPosition && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            top: menuPosition.top,
            left: menuPosition.left,
            minWidth: menuPosition.width,
            zIndex: 99999
          }}
          className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-sm text-left transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark'
                  }`}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check size={16} className="text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
