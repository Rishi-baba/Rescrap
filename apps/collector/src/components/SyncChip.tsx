import React, { useEffect, useState } from 'react';
import { subscribeSyncState, processOutbox, type SyncState } from '../lib/sync.js';
import { collectorSession } from '../lib/session.js';
import { useI18n } from '../lib/i18n.js';

export const SyncChip: React.FC = () => {
  const [syncState, setSyncState] = useState<SyncState>('SYNCED');
  const { t } = useI18n();

  useEffect(() => {
    return subscribeSyncState((next) => setSyncState(next));
  }, []);

  const handleRetry = () => {
    if (syncState === 'FAILED' || syncState === 'OFFLINE') {
      void processOutbox(collectorSession.client);
    }
  };

  const getSyncCopy = () => {
    switch (syncState) {
      case 'OFFLINE':
        return {
          text: t('sync', 'offline') || 'No internet. Your scrap is saved on this phone.',
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          dot: 'bg-amber-500',
        };
      case 'QUEUED':
        return {
          text: t('sync', 'queued') || 'Saved on this phone. Will send when internet comes.',
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          dot: 'bg-amber-500 animate-pulse',
        };
      case 'SYNCING':
        return {
          text: t('sync', 'syncing') || 'Sending…',
          bg: 'bg-blue-100 text-blue-900 border-blue-300',
          dot: 'bg-blue-500 animate-ping',
        };
      case 'SYNCED':
        return {
          text: t('sync', 'synced') || 'Sent.',
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          dot: 'bg-emerald-600',
        };
      case 'FAILED':
        return {
          text: t('sync', 'failed') || "Couldn't send. Tap to try again.",
          bg: 'bg-red-100 text-red-900 border-red-300',
          dot: 'bg-red-600',
        };
    }
  };

  const copy = getSyncCopy();

  return (
    <div
      onClick={handleRetry}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-2 cursor-pointer transition-colors shadow-xs ${copy.bg}`}
      role="status"
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${copy.dot}`} />
      <span className="truncate">{copy.text}</span>
    </div>
  );
};
