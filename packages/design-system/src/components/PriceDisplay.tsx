import React from 'react';

/**
 * Format integer paise into INR with standard Indian grouping (Lakh/Crore).
 * E.g. 123456 paise -> INR 1,234.56
 * E.g. 99999999 paise -> INR 9,99,999.99
 */
export function formatPaiseToInr(paise: number): string {
  const rupees = Math.abs(paise) / 100;
  const formatted = rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${paise < 0 ? '-' : ''}INR ${formatted}`;
}

export function formatApproximatePaise(paise: number): string {
  const rupees = Math.round(Math.abs(paise) / 100);
  const formatted = rupees.toLocaleString('en-IN');
  return `${paise < 0 ? '-' : ''}Around ₹${formatted}`;
}

export interface PriceDisplayProps {
  paise: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg' | 'display';
  isEstimate?: boolean;
  approximate?: boolean;
  tone?: 'default' | 'light' | 'emerald';
  className?: string;
}

const sizeStyles = {
  sm: 'text-sm font-semibold',
  md: 'text-lg font-bold',
  lg: 'text-2xl font-extrabold',
  display: 'text-3xl lg:text-4xl font-black',
};

const toneStyles = {
  default: 'text-stone-900',
  light: 'text-stone-100',
  emerald: 'text-[#34D399]',
};

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  paise,
  label,
  size = 'md',
  isEstimate = false,
  approximate = false,
  tone = 'default',
  className = '',
}) => {
  const shouldApproximate = approximate || isEstimate;
  return (
    <div className={`inline-flex flex-col ${className}`}>
      {label ? <span className="text-xs text-stone-400 font-medium mb-0.5">{label}</span> : null}
      <div className="flex items-baseline gap-1.5">
        <span className={`font-mono tracking-tight ${toneStyles[tone]} ${sizeStyles[size]}`}>
          {shouldApproximate ? formatApproximatePaise(paise) : formatPaiseToInr(paise)}
        </span>
        {isEstimate ? (
          <span className="text-xs uppercase font-extrabold text-amber-950 bg-[#F5E6B3] px-2 py-0.5 rounded border border-amber-300">
            Est.
          </span>
        ) : null}
      </div>
    </div>
  );
};
