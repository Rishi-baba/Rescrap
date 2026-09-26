import React, { useEffect } from 'react';

interface SplashViewProps {
  onDone: () => void;
}

export const SplashView: React.FC<SplashViewProps> = ({ onDone }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDone();
    }, 1200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      onClick={onDone}
      className="fixed inset-0 z-50 bg-emerald-950 flex flex-col items-center justify-center p-6 text-white text-center cursor-pointer"
    >
      <div className="w-20 h-20 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-2xl mb-5">
        <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>

      <h1 className="text-3xl font-black tracking-tight text-white mb-2">ReScrap</h1>
      <p className="text-emerald-300 text-sm max-w-xs font-medium">
        Connecting informal collectors with verified recyclers
      </p>

      <div className="mt-12 flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-emerald-400 font-mono">Starting offline store...</span>
      </div>
    </div>
  );
};
