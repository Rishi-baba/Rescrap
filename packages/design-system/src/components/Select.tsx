import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: readonly SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      error,
      helperText,
      id,
      className = '',
      disabled = false,
      ...props
    },
    ref,
  ) => {
    const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1">
        {label ? (
          <label htmlFor={selectId} className="text-sm font-medium text-stone-700">
            {label}
          </label>
        ) : null}
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error && selectId ? `${selectId}-error` : helperText && selectId ? `${selectId}-helper` : undefined
          }
          className={`w-full rounded-lg border px-3 py-2 text-sm text-stone-900 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent disabled:bg-stone-100 disabled:text-stone-500 disabled:cursor-not-allowed ${
            error ? 'border-red-500 bg-red-50/20' : 'border-stone-300 hover:border-stone-400'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {error ? (
          <p id={selectId ? `${selectId}-error` : undefined} className="text-xs text-red-600 font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p id={selectId ? `${selectId}-helper` : undefined} className="text-xs text-stone-500">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

Select.displayName = 'Select';
