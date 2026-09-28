import React, { useState } from 'react';
import { useI18n, type SupportedLocale } from '../lib/i18n.js';
import { offlineDb } from '../lib/offline-db.js';
import { processOutbox } from '../lib/sync.js';
import { collectorSession } from '../lib/session.js';
import { DemoBanner } from '@rescrap/design-system';

interface ProfileViewProps {
  onOpenLanguage: () => void;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onOpenLanguage, onLogout }) => {
  const { locale } = useI18n();
  const [isOnline, setIsOnline] = useState(offlineDb.isOnline());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const lots = offlineDb.getLots();
  const outbox = offlineDb.getOutbox();
  const pendingOutbox = outbox.filter((o) => o.status === 'PENDING' || o.status === 'FAILED');

  const localeLabels: Record<SupportedLocale, string> = {
    en: 'English (English)',
    hi: 'हिंदी (Hindi)',
    mr: 'मराठी (Marathi)',
  };

  const handleToggleNetwork = () => {
    const next = !isOnline;
    setIsOnline(next);
    offlineDb.setOnline(next);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await processOutbox(collectorSession.client);
      setSyncFeedback(
        res.syncedCount > 0
          ? `Synced ${res.syncedCount} operation(s) successfully!`
          : 'All operations are already up to date.'
      );
    } catch {
      setSyncFeedback('Sync failed: Offline or network unavailable.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-24 text-stone-100">
      {/* Header */}
      <div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#4FD68C]">
          Account &amp; Connectivity
        </span>
        <h2 className="text-xl font-black text-white mt-0.5">
          {locale === 'hi' ? 'मेरी प्रोफाइल' : locale === 'mr' ? 'माझी प्रोफाइल' : 'Collector Profile'}
        </h2>
        <p className="text-xs text-stone-400 mt-1">
          Informal Collector Identity &bull; Offline Storage &bull; Language
        </p>
      </div>

      <DemoBanner />

      {/* Collector ID Card */}
      <div className="p-4 rounded-2xl border border-[#1E3A2B] bg-[#12231B] shadow-lg flex flex-col gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1E8E53] to-[#2FBF71] text-[#07130D] flex items-center justify-center text-xl font-black shadow-md shrink-0">
            SD
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-white text-base truncate">Sunita Devi</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#163324] text-[#4FD68C] border border-[#2FBF71]/30">
                VERIFIED
              </span>
            </div>
            <p className="text-xs text-stone-300 font-mono mt-0.5">+91 90000 00001</p>
            <p className="text-[11px] text-stone-400 mt-0.5">Service Area: Hadapsar &amp; Magarpatta, Pune</p>
          </div>
        </div>

        <div className="pt-3 border-t border-[#1E3A2B] flex items-center justify-between text-xs">
          <span className="text-stone-400 font-medium">Digital ID: <strong className="text-white font-mono">REC-COL-4091</strong></span>
          <span className="text-stone-400 font-mono text-[11px]">Registered: Sept 2026</span>
        </div>
      </div>

      {/* Language Selector Trigger */}
      <div className="p-4 rounded-xl border border-[#1E3A2B] bg-[#12231B] shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-mono text-stone-400 block">
            {locale === 'hi' ? 'भाषा' : locale === 'mr' ? 'भाषा' : 'Language'}
          </span>
          <strong className="text-sm font-bold text-white mt-0.5 block">{localeLabels[locale]}</strong>
        </div>
        <button
          type="button"
          onClick={onOpenLanguage}
          className="min-h-[40px] px-3.5 py-1.5 bg-[#163324] hover:bg-[#1E4330] border border-[#2FBF71]/30 rounded-lg text-xs font-bold text-[#4FD68C] transition-colors"
        >
          {locale === 'hi' ? 'बदलें' : locale === 'mr' ? 'बदला' : 'Change'} &rarr;
        </button>
      </div>

      {/* Network Simulator & Offline Sync Box */}
      <div className="p-4 rounded-xl border border-[#1E3A2B] bg-[#12231B] shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-white text-sm">Offline Storage &amp; Sync</h4>
            <p className="text-xs text-stone-400">Local-first data synchronization (FD-06)</p>
          </div>
          <button
            type="button"
            onClick={handleToggleNetwork}
            className={`min-h-[34px] px-3 py-1 rounded-full text-xs font-mono font-bold border transition-colors flex items-center gap-1.5 ${
              isOnline
                ? 'bg-[#163324] text-[#4FD68C] border-[#2FBF71]/40'
                : 'bg-amber-950/40 text-amber-300 border-amber-600/40'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#4FD68C]' : 'bg-amber-400'}`} />
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs bg-[#0C1A14] p-3 rounded-lg border border-[#1E3A2B]">
          <div>
            <span className="text-stone-400 block text-[10px] font-mono">Stored Lots:</span>
            <strong className="font-mono text-white text-sm">{lots.length}</strong>
          </div>
          <div>
            <span className="text-stone-400 block text-[10px] font-mono">Pending Outbox:</span>
            <strong className="font-mono text-amber-400 text-sm">{pendingOutbox.length}</strong>
          </div>
        </div>

        {syncFeedback && (
          <div className="text-xs p-2.5 rounded-lg bg-[#163324] text-[#4FD68C] border border-[#2FBF71]/30 font-medium">
            {syncFeedback}
          </div>
        )}

        <button
          type="button"
          disabled={isSyncing}
          onClick={handleManualSync}
          className="w-full min-h-[44px] bg-[#1E8E53] hover:bg-[#2FBF71] active:brightness-95 disabled:opacity-40 text-[#07130D] font-extrabold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          {isSyncing ? (
            <span>Syncing outbox operations...</span>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Sync Now / अभी सिंक करें</span>
            </>
          )}
        </button>
      </div>

      {/* Health & Safety Guidelines (Rule SAFE-01..05) */}
      <div className="p-4 rounded-xl border border-[#1E3A2B] bg-[#12231B] shadow-sm flex flex-col gap-2.5">
        <h4 className="font-bold text-white text-sm flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Safety &amp; Safe Dismantling Rules</span>
        </h4>
        <ul className="text-xs text-stone-300 space-y-2 list-disc list-inside leading-relaxed">
          <li>
            <strong className="text-white">Lithium-ion batteries:</strong> Never crush, drop, puncture, or submerge in water. Keep taped terminals in shade.
          </li>
          <li>
            <strong className="text-white">CRT Monitors &amp; Tubes:</strong> High implosion risk and toxic lead oxide. Wear safety goggles and heavy gloves.
          </li>
          <li>
            <strong className="text-white">Compressors &amp; Cooling:</strong> Do not cut refrigerant copper tubes. Releasing CFC/HFC gases is illegal under E-Waste Rules.
          </li>
          <li>
            <strong className="text-white">Acids &amp; Open Burning:</strong> Antigravity platforms strictly ban chemical leaching or acid burning of PCBs. Violators are delisted.
          </li>
        </ul>
      </div>

      {/* Logout Action */}
      <button
        type="button"
        onClick={() => {
          collectorSession.clear();
          onLogout();
        }}
        className="w-full min-h-[46px] border border-rose-900/60 text-rose-300 hover:bg-rose-950/30 active:bg-rose-950/50 rounded-xl text-xs font-bold transition-colors"
      >
        Sign Out / सत्र समाप्त करें
      </button>

      {/* App Version Info */}
      <div className="text-center text-[10px] text-stone-500 font-mono">
        ReScrap Collector Mobile v0.1.0 &bull; CPCB E-Waste (Management) Rules 2022 Compliant
      </div>
    </div>
  );
};
