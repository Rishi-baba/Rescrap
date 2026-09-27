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
    <div className="flex flex-col gap-4 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-stone-900">
          {locale === 'hi' ? 'मेरी प्रोफाइल' : locale === 'mr' ? 'माझी प्रोफाइल' : 'Collector Profile'}
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          Informal Collector Identity &bull; Offline Storage &bull; Language
        </p>
      </div>

      <DemoBanner />

      {/* Collector ID Card */}
      <div className="p-4 rounded-2xl border border-stone-200 bg-white shadow-xs flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xl font-extrabold shadow-sm shrink-0">
            SD
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-stone-900 text-base truncate">Sunita Devi</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                VERIFIED
              </span>
            </div>
            <p className="text-xs text-stone-600 font-mono">+91 90000 00001</p>
            <p className="text-[11px] text-stone-500">Service Area: Hadapsar &amp; Magarpatta, Pune</p>
          </div>
        </div>

        <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
          <span className="text-stone-500 font-medium">Digital ID: <strong className="text-stone-800 font-mono">REC-COL-4091</strong></span>
          <span className="text-stone-500 font-medium">Registered: Sept 2026</span>
        </div>
      </div>

      {/* Language Selector Trigger */}
      <div className="p-3.5 rounded-xl border border-stone-200 bg-white shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs text-stone-500 font-medium block">
            {locale === 'hi' ? 'भाषा' : locale === 'mr' ? 'भाषा' : 'Language'}
          </span>
          <strong className="text-sm font-bold text-stone-900">{localeLabels[locale]}</strong>
        </div>
        <button
          type="button"
          onClick={onOpenLanguage}
          className="min-h-[44px] px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold text-stone-800 transition-colors"
        >
          {locale === 'hi' ? 'बदलें' : locale === 'mr' ? 'बदला' : 'Change'} &rarr;
        </button>
      </div>

      {/* Network Simulator & Offline Sync Box */}
      <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-stone-900 text-sm">Offline Storage &amp; Sync</h4>
            <p className="text-xs text-stone-500">Local-first data synchronization (FD-06)</p>
          </div>
          <button
            type="button"
            onClick={handleToggleNetwork}
            className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
              isOnline
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-100 text-amber-900 border-amber-300'
            }`}
          >
            {isOnline ? '🟢 Network: Online' : '🟠 Network: Offline'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50 p-2.5 rounded-lg border border-stone-100">
          <div>
            <span className="text-stone-500">Stored Lots:</span>{' '}
            <strong className="font-mono text-stone-900">{lots.length}</strong>
          </div>
          <div>
            <span className="text-stone-500">Pending Outbox:</span>{' '}
            <strong className="font-mono text-amber-700">{pendingOutbox.length}</strong>
          </div>
        </div>

        {syncFeedback && (
          <div className="text-xs p-2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
            {syncFeedback}
          </div>
        )}

        <button
          type="button"
          disabled={isSyncing}
          onClick={handleManualSync}
          className="w-full min-h-[44px] bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
        >
          {isSyncing ? (
            <span>Syncing outbox operations...</span>
          ) : (
            <>
              <span>🔄 Sync Now / अभी सिंक करें</span>
            </>
          )}
        </button>
      </div>

      {/* Health & Safety Guidelines (Rule SAFE-01..05) */}
      <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-xs flex flex-col gap-2.5">
        <h4 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
          <span>⚠️</span>
          <span>Safety &amp; Safe Dismantling Rules</span>
        </h4>
        <ul className="text-xs text-stone-600 space-y-2 list-disc list-inside">
          <li>
            <strong>Lithium-ion batteries:</strong> Never crush, drop, puncture, or submerge in water. Keep taped terminals in shade.
          </li>
          <li>
            <strong>CRT Monitors &amp; Tubes:</strong> High implosion risk and toxic lead oxide. Wear safety goggles and heavy gloves.
          </li>
          <li>
            <strong>Compressors &amp; Cooling:</strong> Do not cut refrigerant copper tubes. Releasing CFC/HFC gases is illegal under E-Waste Rules.
          </li>
          <li>
            <strong>Acids &amp; Open Burning:</strong> Antigravity platforms strictly ban chemical leaching or acid burning of PCBs. Violators are delisted.
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
        className="w-full min-h-[48px] border border-red-300 text-red-700 hover:bg-red-50 active:bg-red-100 rounded-xl text-xs font-bold transition-colors"
      >
        Sign Out / सत्र समाप्त करें
      </button>

      {/* App Version Info */}
      <div className="text-center text-[10px] text-stone-400 font-mono">
        ReScrap Collector Mobile v0.1.0 &bull; CPCB E-Waste (Management) Rules 2022 Compliant
      </div>
    </div>
  );
};
