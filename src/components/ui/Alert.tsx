import React from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onClose,
  className = '',
}) => {
  const getVariantClasses = (): string => {
    switch (variant) {
      case 'info':
        return 'bg-primary-50 text-primary-800 border-primary-200';
      case 'success':
        return 'bg-success-50 text-success-800 border-success-200';
      case 'warning':
        return 'bg-warning-50 text-warning-800 border-warning-200';
      case 'error':
        return 'bg-error-50 text-error-800 border-error-200';
      default:
        return 'bg-primary-50 text-primary-800 border-primary-200';
    }
  };

  const getIcon = (): React.ReactNode => {
    const iconSize = 18;
    
    switch (variant) {
      case 'info':
        return <Info size={iconSize} className="text-primary-500" />;
      case 'success':
        return <CheckCircle size={iconSize} className="text-success-500" />;
      case 'warning':
        return <AlertTriangle size={iconSize} className="text-warning-500" />;
      case 'error':
        return <AlertCircle size={iconSize} className="text-error-500" />;
      default:
        return <Info size={iconSize} className="text-primary-500" />;
    }
  };

  return (
    <div
      className={`
        rounded-md border p-4
        ${getVariantClasses()}
        ${className}
      `}
      role="alert"
    >
      <div className="flex">
        <div className="flex-shrink-0 mr-3 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1">{title}</h3>
          )}
          <div className="text-sm">
            {children}
          </div>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                className={`
                  inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${variant === 'info' ? 'focus:ring-primary-500' : ''}
                  ${variant === 'success' ? 'focus:ring-success-500' : ''}
                  ${variant === 'warning' ? 'focus:ring-warning-500' : ''}
                  ${variant === 'error' ? 'focus:ring-error-500' : ''}
                `}
                onClick={onClose}
              >
                <span className="sr-only">Dismiss</span>
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert;