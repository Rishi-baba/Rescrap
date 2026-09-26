import React from 'react';
import { useI18n, type SupportedLocale } from '../lib/i18n.js';
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

  const localeLabels: Record<SupportedLocale, string> = {
    en: 'EN',
    hi: 'हिं',
    mr: 'मरा',
  };

  const handleToggle = () => {
    const next = !isOnline;
    offlineDb.setOnline(next);
    onToggleOnline(next);
    if (next) {
      void processOutbox(collectorSession.client);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-emerald-900 text-white px-4 py-3 shadow-md flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xl font-black tracking-tight text-white">ReScrap</span>
        <span className="text-[10px] font-bold uppercase bg-emerald-700/80 text-emerald-100 px-1.5 py-0.5 rounded">
          Collector
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Network Simulation Toggle */}
        <button
          type="button"
          onClick={handleToggle}
          title={isOnline ? 'Tap to simulate Airplane Mode (Offline)' : 'Tap to restore Online connection'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
            isOnline
              ? 'bg-emerald-800 text-emerald-100 border-emerald-600 hover:bg-emerald-700'
              : 'bg-amber-500 text-stone-900 border-amber-400 font-extrabold shadow-sm'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-600'}`} />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </button>

        {/* Language Switcher Button */}
        <button
          type="button"
          onClick={onOpenLanguage}
          className="px-2.5 py-1 rounded-lg bg-emerald-800 text-emerald-100 border border-emerald-700 text-xs font-bold hover:bg-emerald-700 transition-colors"
          aria-label="Change language"
        >
          {localeLabels[locale]} &bull; भाषा
        </button>
      </div>
    </header>
  );
};
