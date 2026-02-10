import React, { useState } from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-12 h-12'
};

const iconSizes = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24
};

const textSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg'
};

/**
 * Avatar component with fallback handling
 *
 * Displays user avatar with automatic fallback when:
 * - No src is provided
 * - Image fails to load (404, CORS error, etc.)
 *
 * Fallback shows initials from name, or a user icon if no name provided.
 */
export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = '',
  name,
  size = 'md',
  className = ''
}) => {
  const [hasError, setHasError] = useState(false);

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const showFallback = !src || hasError;

  if (showFallback) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ${className}`}
      >
        {name ? (
          <span className={`${textSizes[size]} font-medium text-primary`}>
            {getInitials(name)}
          </span>
        ) : (
          <User size={iconSizes[size]} className="text-primary" />
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0 ${className}`}
    />
  );
};
