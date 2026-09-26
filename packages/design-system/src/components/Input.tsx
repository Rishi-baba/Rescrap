import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  isNumericTabular?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      id,
      className = '',
      isNumericTabular = false,
      disabled = false,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium text-stone-700">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error && inputId ? `${inputId}-error` : helperText && inputId ? `${inputId}-helper` : undefined
          }
          className={`w-full rounded-lg border px-3 py-2 text-sm text-stone-900 placeholder-stone-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent disabled:bg-stone-100 disabled:text-stone-500 disabled:cursor-not-allowed ${
            isNumericTabular ? 'font-mono' : ''
          } ${error ? 'border-red-500 bg-red-50/20' : 'border-stone-300 bg-white hover:border-stone-400'} ${className}`}
          {...props}
        />
        {error ? (
          <p id={inputId ? `${inputId}-error` : undefined} className="text-xs text-red-600 font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p id={inputId ? `${inputId}-helper` : undefined} className="text-xs text-stone-500">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
