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
      className="fixed inset-0 z-50 bg-[#08130E] flex flex-col items-center justify-center p-6 text-white text-center cursor-pointer"
    >
      {/* Brand Swirl Emblem */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#1E8E53] via-[#2FBF71] to-[#4FD68C] flex items-center justify-center shadow-2xl shadow-emerald-950/80 mb-5 p-1">
        <svg className="w-full h-full text-[#08130E]" viewBox="0 0 32 32" fill="none">
          <path
            d="M16 4C9.37 4 4 9.37 4 16C4 19.38 5.4 22.44 7.67 24.62L10.5 21.8C9 20.3 8 18.26 8 16C8 11.58 11.58 8 16 8C19.31 8 22.18 10.02 23.4 12.92L20 15H28V7L25.35 9.65C23.23 6.2 19.37 4 16 4Z"
            fill="currentColor"
          />
          <path
            d="M16 28C22.63 28 28 22.63 28 16C28 12.62 26.6 9.56 24.33 7.38L21.5 10.2C23 11.7 24 13.74 24 16C24 20.42 20.42 24 16 24C12.69 24 9.82 21.98 8.6 19.08L12 17H4V25L6.65 22.35C8.77 25.8 12.63 28 16 28Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <h1 className="text-3xl font-black tracking-tight text-white mb-1">ReScrap</h1>
      <span className="text-xs text-[#2FBF71] font-semibold tracking-wide mb-3">
        अच्छा कबाड़, बेहतर कल
      </span>
      <p className="text-stone-400 text-xs max-w-xs font-medium leading-relaxed">
        Connecting informal collectors with verified recyclers
      </p>

      <div className="mt-12 flex flex-col items-center gap-2">
        <div className="w-5 h-5 border-2 border-[#2FBF71] border-t-transparent rounded-full animate-spin" />
        <span className="text-[11px] text-[#4FD68C] font-mono">Starting offline store...</span>
      </div>
    </div>
  );
};
