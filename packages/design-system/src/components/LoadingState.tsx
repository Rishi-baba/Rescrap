import React from 'react';

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Loading...',
  className = '',
}) => {
  return (
    <div className={`p-8 text-center flex flex-col items-center justify-center gap-3 ${className}`} role="status">
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 rounded-full border-2 border-stone-200" />
        <div className="absolute inset-0 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
      </div>
      <p className="text-xs text-stone-500 font-medium">{label}</p>
    </div>
  );
};
