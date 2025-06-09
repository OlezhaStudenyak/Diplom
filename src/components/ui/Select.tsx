import React, { forwardRef } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value'> {
  label?: string;
  options: SelectOption[];
  value?: string;
  helperText?: string;
  errorText?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    label, 
    options, 
    helperText, 
    errorText, 
    fullWidth = false,
    leftIcon,
    className = '',
    id,
    ...props 
  }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substring(2, 9)}`;
    const hasError = !!errorText;
    
    const baseSelectClasses = `
      block
      rounded-md
      border
      shadow-sm
      bg-white
      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
      transition duration-150 ease-in-out
      disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed
    `;
    
    const selectStateClasses = hasError
      ? 'border-error-500 text-error-900'
      : 'border-neutral-300 text-neutral-900';
    
    const selectSizeClasses = leftIcon ? 'pl-10 pr-3 py-2 text-sm' : 'px-3 py-2 text-sm';
    
    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-neutral-700 mb-1">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
              {leftIcon}
            </div>
          )}
          
          <select
            ref={ref}
            id={selectId}
            className={`
              ${baseSelectClasses}
              ${selectStateClasses}
              ${selectSizeClasses}
              ${fullWidth ? 'w-full' : ''}
            `}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        {helperText && !hasError && (
          <p id={`${selectId}-helper`} className="mt-1 text-xs text-neutral-500">
            {helperText}
          </p>
        )}
        
        {hasError && (
          <p id={`${selectId}-error`} className="mt-1 text-xs text-error-600">
            {errorText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;