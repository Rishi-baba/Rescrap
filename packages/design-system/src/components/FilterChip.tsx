import React from 'react';

export interface FilterChipProps {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  active = false,
  count,
  onClick,
  onRemove,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors select-none ${
        active
          ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:text-stone-900'
      } ${className}`}
    >
      <span>{label}</span>
      {typeof count === 'number' ? (
        <span
          className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            active ? 'bg-emerald-200 text-emerald-800' : 'bg-stone-100 text-stone-600'
          }`}
        >
          {count}
        </span>
      ) : null}
      {onRemove ? (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-emerald-200/60 text-emerald-800"
          aria-label={`Remove filter ${label}`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      ) : null}
    </button>
  );
};
