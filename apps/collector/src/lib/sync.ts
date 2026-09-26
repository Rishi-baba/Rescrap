/**
 * Outbox Sync Engine for Collector App.
 *
 * Implements Rule SB-10 / FD-06: Outbox sync engine with idempotency keys.
 * Replays queued offline operations when connectivity returns without duplicates.
 */
import { offlineDb } from './offline-db.js';
import { CollectorApiClient } from './api.js';

export type SyncState = 'SYNCED' | 'SYNCING' | 'OFFLINE' | 'QUEUED' | 'FAILED';

type Listener = (state: SyncState) => void;
const syncListeners = new Set<Listener>();

let currentSyncState: SyncState = offlineDb.isOnline() ? 'SYNCED' : 'OFFLINE';

export function getSyncState(): SyncState {
  if (!offlineDb.isOnline()) {
    const queue = offlineDb.getOutbox().filter((q) => q.status === 'PENDING');
    return queue.length > 0 ? 'QUEUED' : 'OFFLINE';
  }
  return currentSyncState;
}

function notifySyncState(state: SyncState) {
  currentSyncState = state;
  for (const l of syncListeners) l(state);
}

export function subscribeSyncState(listener: Listener): () => void {
  syncListeners.add(listener);
  listener(getSyncState());
  return () => {
    syncListeners.delete(listener);
  };
}

export async function processOutbox(client: CollectorApiClient): Promise<{ syncedCount: number }> {
  let syncedCount = 0;
  if (!offlineDb.isOnline()) {
    notifySyncState(getSyncState());
    return { syncedCount: 0 };
  }

  const outbox = offlineDb.getOutbox();
  const pending = outbox.filter((op) => op.status === 'PENDING' || op.status === 'FAILED');

  if (pending.length === 0) {
    notifySyncState('SYNCED');
    return { syncedCount: 0 };
  }

  notifySyncState('SYNCING');

  for (const op of pending) {
    offlineDb.updateOutboxItem(op.id, { status: 'SYNCING' });
    try {
      if (op.operation === 'SUBMIT_LOT') {
        const payload = op.payload as any;
        const res = await client.submitLot({ ...payload, idempotencyKey: op.idempotencyKey });
        offlineDb.updateOutboxItem(op.id, { status: 'SYNCED' });
        if (op.lotId) {
          const localLot = offlineDb.getLot(op.lotId);
          if (localLot) {
            localLot.syncStatus = 'SYNCED';
            if (res && res.data && res.data.id) {
              localLot.id = res.data.id;
            }
            offlineDb.saveLot(localLot);
          }
        }
        syncedCount++;
      } else if (op.operation === 'ACCEPT_OFFER') {
        const offerId = (op.payload['offerId'] as string) || op.id;
        await client.acceptOffer(offerId, op.idempotencyKey);
        offlineDb.updateOutboxItem(op.id, { status: 'SYNCED' });
        syncedCount++;
      }
    } catch {
      offlineDb.updateOutboxItem(op.id, {
        status: 'FAILED',
        retryCount: op.retryCount + 1,
      });
      notifySyncState('FAILED');
      return { syncedCount };
    }
  }

  notifySyncState('SYNCED');
  return { syncedCount };
}
