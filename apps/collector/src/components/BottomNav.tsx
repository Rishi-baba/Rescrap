import React from 'react';
import { useI18n } from '../lib/i18n.js';

export type CollectorTab = 'home' | 'my-scrap' | 'prices' | 'earnings' | 'profile';

interface BottomNavProps {
  activeTab: CollectorTab;
  onTabChange: (tab: CollectorTab) => void;
  onStartAddScrap?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onStartAddScrap,
}) => {
  const { t } = useI18n();

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#0C1A14]/95 backdrop-blur-lg border-t border-[#1C3326] z-40 px-3 py-2 shadow-2xl">
      <div className="flex items-center justify-between relative">
        {/* Tab 1: Home */}
        <button
          type="button"
          onClick={() => onTabChange('home')}
          aria-current={activeTab === 'home' ? 'page' : undefined}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl transition-all ${
            activeTab === 'home'
              ? 'bg-[#183627] text-[#2FBF71] font-bold shadow-xs'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
          <span className="text-xs font-semibold">{t('collector', 'home') || 'Home'}</span>
        </button>

        {/* Tab 2: My Scrap */}
        <button
          type="button"
          onClick={() => onTabChange('my-scrap')}
          aria-current={activeTab === 'my-scrap' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
            activeTab === 'my-scrap' ? 'text-[#2FBF71] font-bold' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span className="text-[10px] font-medium leading-none mt-0.5">
            {t('collector', 'myScrap') || 'My Scrap'}
          </span>
        </button>

        {/* Tab 3: Center Elevated Camera Action */}
        <div className="relative -top-5 flex flex-col items-center">
          <button
            type="button"
            onClick={onStartAddScrap ?? (() => onTabChange('home'))}
            title="Take Photo & Add Scrap"
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#1E8E53] to-[#2FBF71] shadow-lg shadow-emerald-950/80 border-4 border-[#0C1A14] flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Tab 4: Earnings */}
        <button
          type="button"
          onClick={() => onTabChange('earnings')}
          aria-current={activeTab === 'earnings' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
            activeTab === 'earnings' ? 'text-[#2FBF71] font-bold' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-[10px] font-medium leading-none mt-0.5">
            {t('collector', 'earnings') || 'Earnings'}
          </span>
        </button>

        {/* Tab 5: Profile */}
        <button
          type="button"
          onClick={() => onTabChange('profile')}
          aria-current={activeTab === 'profile' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
            activeTab === 'profile' ? 'text-[#2FBF71] font-bold' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[10px] font-medium leading-none mt-0.5">
            {t('collector', 'profile') || 'Profile'}
          </span>
        </button>
      </div>
    </nav>
  );
};
