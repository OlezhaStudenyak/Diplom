import React from 'react';

type BadgeVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'neutral';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
  outlined?: boolean;
}

const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  dot = false,
  outlined = false,
}) => {
  const getVariantClasses = (): string => {
    if (outlined) {
      switch (variant) {
        case 'primary':
          return 'bg-primary-50 text-primary-700 border border-primary-300';
        case 'secondary':
          return 'bg-secondary-50 text-secondary-700 border border-secondary-300';
        case 'accent':
          return 'bg-accent-50 text-accent-700 border border-accent-300';
        case 'success':
          return 'bg-success-50 text-success-700 border border-success-300';
        case 'warning':
          return 'bg-warning-50 text-warning-700 border border-warning-300';
        case 'error':
          return 'bg-error-50 text-error-700 border border-error-300';
        case 'neutral':
          return 'bg-neutral-50 text-neutral-700 border border-neutral-300';
        default:
          return 'bg-primary-50 text-primary-700 border border-primary-300';
      }
    } else {
      switch (variant) {
        case 'primary':
          return 'bg-primary-100 text-primary-800';
        case 'secondary':
          return 'bg-secondary-100 text-secondary-800';
        case 'accent':
          return 'bg-accent-100 text-accent-800';
        case 'success':
          return 'bg-success-100 text-success-800';
        case 'warning':
          return 'bg-warning-100 text-warning-800';
        case 'error':
          return 'bg-error-100 text-error-800';
        case 'neutral':
          return 'bg-neutral-100 text-neutral-800';
        default:
          return 'bg-primary-100 text-primary-800';
      }
    }
  };

  const getSizeClasses = (): string => {
    switch (size) {
      case 'sm':
        return 'text-xs px-1.5 py-0.5';
      case 'md':
        return 'text-xs px-2 py-1';
      case 'lg':
        return 'text-sm px-2.5 py-1';
      default:
        return 'text-xs px-2 py-1';
    }
  };

  const getDotColor = (): string => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-500';
      case 'secondary':
        return 'bg-secondary-500';
      case 'accent':
        return 'bg-accent-500';
      case 'success':
        return 'bg-success-500';
      case 'warning':
        return 'bg-warning-500';
      case 'error':
        return 'bg-error-500';
      case 'neutral':
        return 'bg-neutral-500';
      default:
        return 'bg-primary-500';
    }
  };

  return (
    <span
      className={`
        inline-flex items-center
        rounded-full
        font-medium
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`
            mr-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full
            ${getDotColor()}
          `}
        />
      )}
      {children}
    </span>
  );
};

export default Badge;