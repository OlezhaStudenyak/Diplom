import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    helperText, 
    errorText, 
    leftIcon, 
    rightIcon, 
    fullWidth = false,
    className = '',
    id,
    ...props 
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
    const hasError = !!errorText;
    
    const baseInputClasses = `
      block bg-white
      rounded-md
      border
      shadow-sm
      placeholder-neutral-400
      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
      transition duration-150 ease-in-out
      disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed
    `;
    
    const inputStateClasses = hasError
      ? 'border-error-500 text-error-900'
      : 'border-neutral-300 text-neutral-900';
    
    const inputSizeClasses = 'px-4 py-2 text-sm';
    
    const iconClasses = 'absolute top-1/2 -translate-y-1/2 text-neutral-500';
    
    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700 mb-1">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className={`${iconClasses} left-3`}>
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={`
              ${baseInputClasses}
              ${inputStateClasses}
              ${inputSizeClasses}
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${fullWidth ? 'w-full' : ''}
            `}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          
          {rightIcon && (
            <div className={`${iconClasses} right-3`}>
              {rightIcon}
            </div>
          )}
        </div>
        
        {helperText && !hasError && (
          <p id={`${inputId}-helper`} className="mt-1 text-xs text-neutral-500">
            {helperText}
          </p>
        )}
        
        {hasError && (
          <p id={`${inputId}-error`} className="mt-1 text-xs text-error-600">
            {errorText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;