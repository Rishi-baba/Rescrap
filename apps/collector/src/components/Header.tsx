import React from 'react';
import { useI18n } from '../lib/i18n.js';
import { offlineDb } from '../lib/offline-db.js';
import { processOutbox } from '../lib/sync.js';
import { collectorSession } from '../lib/session.js';

interface HeaderProps {
  onOpenLanguage: () => void;
  isOnline: boolean;
  onToggleOnline: (next: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenLanguage,
  isOnline,
  onToggleOnline,
}) => {
  const { locale } = useI18n();

  const handleToggle = () => {
    const next = !isOnline;
    offlineDb.setOnline(next);
    onToggleOnline(next);
    if (next) {
      void processOutbox(collectorSession.client);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#0C1A14]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-[#1A3024]">
      {/* Brand Logo & Hindi Tagline */}
      <div className="flex items-center gap-2.5">
        {/* Dynamic circular green swirl logo */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1E8E53] via-[#2FBF71] to-[#4FD68C] flex items-center justify-center shadow-sm shadow-emerald-950/40 p-0.5">
          <svg className="w-full h-full text-[#0C1A14]" viewBox="0 0 32 32" fill="none">
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

        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tight text-white leading-none">ReScrap</span>
          <span className="text-[10px] text-[#4FD68C] font-semibold tracking-wide mt-0.5">
            {locale === 'mr' ? 'चांगला भंगार, उत्तम भविष्य' : 'अच्छा कबाड़, बेहतर कल'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Network & Offline Status Pill (Clickable Simulation Toggle) */}
        <button
          type="button"
          onClick={handleToggle}
          title={isOnline ? 'Tap to simulate Offline Mode' : 'Tap to restore Online connection'}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#15271E] border border-[#233F2E] hover:border-[#355B44] transition-all text-left shadow-xs"
        >
          {isOnline ? (
            <svg className="w-3.5 h-3.5 text-[#2FBF71] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.393 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          )}

          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-bold text-stone-200">
              {isOnline ? 'Online' : 'No internet'}
            </span>
            <span className="text-[8px] text-[#4FD68C] font-medium">
              {isOnline ? 'Synced with hub' : 'Saved on this phone'}
            </span>
          </div>
        </button>

        {/* Profile / Language Avatar Button */}
        <button
          type="button"
          onClick={onOpenLanguage}
          title="Profile & Language settings"
          className="w-9 h-9 rounded-full bg-[#15271E] border border-[#233F2E] hover:border-[#355B44] flex items-center justify-center text-stone-300 hover:text-white transition-all shadow-xs"
          aria-label="Change language or view profile"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
      </div>
    </header>
  );
};
