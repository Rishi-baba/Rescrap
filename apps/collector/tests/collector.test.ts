import { describe, expect, it, vi, beforeEach } from 'vitest';
import { offlineDb, type LocalScrapLot } from '../src/lib/offline-db.js';
import { processOutbox } from '../src/lib/sync.js';
import { setAppLocale, getAppLocale } from '../src/lib/i18n.js';
import { createTranslator, formatMoney, money } from '@rescrap/shared';

describe('Collector Offline Database & Outbox Store', () => {
  beforeEach(() => {
    offlineDb.clearOutbox();
    offlineDb.setOnline(true);
  });

  it('saves and retrieves local scrap lots correctly', () => {
    const testLot: LocalScrapLot = {
      id: 'lot_test_01',
      materialId: 'mat_laptop',
      materialName: 'Laptop Scrap',
      categoryName: 'Computing',
      declaredWeightKg: 15,
      condition: 'GOOD',
      sourceType: 'HOUSEHOLD',
      estimatedValuePaise: 210000,
      collectionArea: 'Pune - Hadapsar',
      createdAt: new Date().toISOString(),
      syncStatus: 'SAVED_LOCALLY',
      lifecycleState: 'DRAFT',
    };

    offlineDb.saveLot(testLot);
    const retrieved = offlineDb.getLot('lot_test_01');
    expect(retrieved).toBeDefined();
    expect(retrieved?.materialName).toBe('Laptop Scrap');
    expect(retrieved?.declaredWeightKg).toBe(15);
    expect(retrieved?.estimatedValuePaise).toBe(210000);

    // Update the lot
    if (retrieved) {
      retrieved.lifecycleState = 'OFFER_ACCEPTED';
      offlineDb.saveLot(retrieved);
    }
    const updated = offlineDb.getLot('lot_test_01');
    expect(updated?.lifecycleState).toBe('OFFER_ACCEPTED');
  });

  it('queues offline operations and updates status in outbox', () => {
    const queued = offlineDb.enqueue({
      id: 'op_1',
      operation: 'SUBMIT_LOT',
      lotId: 'lot_test_01',
      payload: { materialId: 'mat_laptop', declaredWeightKg: 10 },
      idempotencyKey: 'idem_op_1',
    });

    expect(queued.status).toBe('PENDING');
    expect(queued.retryCount).toBe(0);

    const outbox = offlineDb.getOutbox();
    expect(outbox.length).toBe(1);
    expect(outbox[0]?.id).toBe('op_1');

    offlineDb.updateOutboxItem('op_1', { status: 'SYNCED' });
    const updatedOutbox = offlineDb.getOutbox();
    expect(updatedOutbox[0]?.status).toBe('SYNCED');
  });

  it('manages online and offline simulated network toggle', () => {
    offlineDb.setOnline(false);
    expect(offlineDb.isOnline()).toBe(false);

    offlineDb.setOnline(true);
    expect(offlineDb.isOnline()).toBe(true);
  });

  it('persists locale settings correctly', () => {
    setAppLocale('hi');
    expect(getAppLocale()).toBe('hi');
    expect(offlineDb.getLocale()).toBe('hi');

    setAppLocale('mr');
    expect(getAppLocale()).toBe('mr');

    setAppLocale('en');
    expect(getAppLocale()).toBe('en');
  });
});

describe('Collector Outbox Sync Engine', () => {
  beforeEach(() => {
    offlineDb.clearOutbox();
    offlineDb.setOnline(true);
  });

  it('replays queued operations with idempotency keys when online', async () => {
    offlineDb.enqueue({
      id: 'op_sync_1',
      operation: 'SUBMIT_LOT',
      lotId: 'lot_sync_1',
      payload: {
        materialId: 'mat_mobile_phone',
        declaredWeightKg: 5,
        condition: 'GOOD',
      },
      idempotencyKey: 'key_sync_1',
    });

    const mockClient = {
      submitLot: vi.fn().mockResolvedValue({
        data: {
          lotId: 'lot_sync_1',
          state: 'SUBMITTED',
        },
      }),
      acceptOffer: vi.fn(),
      declineOffer: vi.fn(),
      verifyHandover: vi.fn(),
    };

    const res = await processOutbox(mockClient as any);
    expect(res.syncedCount).toBe(1);
    expect(mockClient.submitLot).toHaveBeenCalledTimes(1);
    expect(mockClient.submitLot).toHaveBeenCalledWith(
      expect.objectContaining({
        materialId: 'mat_mobile_phone',
        declaredWeightKg: 5,
        idempotencyKey: 'key_sync_1',
      }),
    );

    const outbox = offlineDb.getOutbox();
    expect(outbox[0]?.status).toBe('SYNCED');
  });

  it('halts sync and marks operations when client is offline or network errors occur', async () => {
    offlineDb.enqueue({
      id: 'op_sync_fail',
      operation: 'ACCEPT_OFFER',
      payload: { offerId: 'off_1' },
      idempotencyKey: 'key_fail_1',
    });

    const mockFailingClient = {
      submitLot: vi.fn(),
      acceptOffer: vi.fn().mockRejectedValue(new Error('Network request failed: offline')),
      declineOffer: vi.fn(),
      verifyHandover: vi.fn(),
    };

    const res = await processOutbox(mockFailingClient as any);
    expect(res.syncedCount).toBe(0);
    const outbox = offlineDb.getOutbox();
    expect(outbox[0]?.status).toBe('FAILED');
    expect(outbox[0]?.retryCount).toBe(1);
  });
});

describe('Collector i18n & Domain Calculations', () => {
  it('translates core UI messages in Hindi, Marathi, and English', () => {
    const trEn = createTranslator('en');
    const trHi = createTranslator('hi');
    const trMr = createTranslator('mr');

    expect(trEn.t('collector', 'home')).toBe('Home');
    expect(trHi.t('collector', 'home')).toBe('होम');
    expect(trMr.t('collector', 'home')).toBe('मुख्यपृष्ठ');

    expect(trEn.t('collector', 'myScrap')).toBe('My Scrap');
    expect(trHi.t('collector', 'myScrap')).toBe('मेरा स्क्रैप');
    expect(trMr.t('collector', 'myScrap')).toBe('माझा स्क्रॅप');
  });

  it('calculates integer paise estimates without float drift and formats currency', () => {
    const weightKg = 12.5;
    const ratePaisePerKg = 18000; // ₹180.00/kg
    const totalPaise = Math.round(weightKg * ratePaisePerKg);

    expect(totalPaise).toBe(225000); // ₹2,250.00
    const formatted = formatMoney(money(totalPaise));
    expect(formatted).toContain('2,250');
  });

  it('evaluates discrepancy threshold (>10%) between declared and measured weights', () => {
    const declared = 10;
    const withinTolerance = 10.8; // 8% difference
    const overTolerance = 11.5; // 15% difference

    const diffPercentWithin = Math.abs(withinTolerance - declared) / declared;
    const diffPercentOver = Math.abs(overTolerance - declared) / declared;

    expect(diffPercentWithin > 0.1).toBe(false);
    expect(diffPercentOver > 0.1).toBe(true);
  });
});
