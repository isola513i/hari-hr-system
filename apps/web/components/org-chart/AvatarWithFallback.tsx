import React, { useState } from 'react';

// Avatar with fallback to initials
export const AvatarWithFallback: React.FC<{
  src: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  isRoot?: boolean;
}> = ({ src, name, size = 'md', isRoot = false }) => {
  const [hasError, setHasError] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getColorFromName = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-rose-500',
      'bg-cyan-500',
      'bg-emerald-500',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const sizeClasses = {
    sm: isRoot ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm',
    md: isRoot ? 'w-14 h-14 text-lg' : 'w-12 h-12 text-base',
    lg: isRoot ? 'w-16 h-16 text-xl' : 'w-14 h-14 text-lg',
  };

  const ringClasses = isRoot ? 'ring-primary/30' : 'ring-gray-100 dark:ring-gray-700';

  if (hasError || !src || src.startsWith('blob:')) {
    return (
      <div
        className={`${sizeClasses[size]} ${getColorFromName(name)} rounded-full flex items-center justify-center text-white font-semibold ring-2 ${ringClasses}`}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={`${sizeClasses[size]} rounded-full object-cover ring-2 ${ringClasses}`}
      onError={() => setHasError(true)}
    />
  );
};
