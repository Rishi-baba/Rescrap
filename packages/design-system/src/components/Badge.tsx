import React from 'react';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  children: React.ReactNode;
}

const toneStyles: Record<BadgeTone, string> = {
  neutral: 'bg-stone-100 text-stone-800 border-stone-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-sky-50 text-sky-800 border-sky-200',
  purple: 'bg-violet-50 text-violet-800 border-violet-200',
};

export const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  children,
  className = '',
  ...props
}) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${toneStyles[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
