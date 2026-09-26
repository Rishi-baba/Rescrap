/**
 * Security boundary tests (workflow-and-security.md 4).
 *
 * These are the tests that matter most: they assert that the SERVER refuses
 * what a client should never be able to do. A UI can be bypassed; these
 * endpoints cannot.
 */
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  ADMIN_PHONE,
  COLLECTOR_PHONE,
  RECYCLER_PHONE,
  auth,
  key,
  lotPayload,
  makeApp,
  signIn,
  type Session,
} from './helpers.js';

let app: FastifyInstance;

beforeEach(async () => {
  app = await makeApp();
});
afterEach(async () => {
  await app.close();
});

describe('SB-1 unauthenticated -> authenticated', () => {
  it('rejects every protected route without a token', async () => {
    const protectedRoutes = [
      ['GET', '/collector/lots'],
      ['POST', '/collector/lots'],
      ['GET', '/collector/earnings'],
      ['GET', '/recycler/dashboard'],
      ['GET', '/recycler/lots'],
      ['GET', '/admin/dashboard'],
      ['GET', '/admin/audit'],
      ['GET', '/admin/lots'],
      ['GET', '/auth/me'],
      ['POST', '/sync'],
    ] as const;

    for (const [method, url] of protectedRoutes) {
      const res = await app.inject({ method, url, payload: method === 'GET' ? undefined : {} });
      expect(res.statusCode, `${method} ${url}`).toBe(401);
      expect(res.json<{ error: { code: string } }>().error.code).toBe('UNAUTHENTICATED');
    }
  });

  it('rejects a forged token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/collector/lots',
      headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.deadbeef' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('INVALID_TOKEN');
  });

  it('rejects a refresh token used as an access token', async () => {
    const session = await signIn(app, COLLECTOR_PHONE, 'COLLECTOR');
    const res = await app.inject({
      method: 'GET',
      url: '/collector/lots',
      headers: { authorization: `Bearer ${session.refreshToken}` },
    });
    expect(res.statusCode).toBe(401);
  });

  it('leaves /health and /meta open', async () => {
    expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/meta' })).statusCode).toBe(200);
  });
});

describe('SB-2 role authorization is server-side', () => {
  it('refuses collector routes to a recycler session', async () => {
    const recycler = await signIn(app, RECYCLER_PHONE, 'RECYCLER');
    for (const url of ['/collector/lots', '/collector/earnings']) {
      const res = await app.inject({ method: 'GET', url, headers: auth(recycler) });
      expect(res.statusCode, url).toBe(403);
      expect(res.json<{ error: { code: string } }>().error.code).toBe('FORBIDDEN');
    }
  });

  it('refuses recycler routes to a collector session', async () => {
    const collector = await signIn(app, COLLECTOR_PHONE, 'COLLECTOR');
    for (const url of ['/recycler/dashboard', '/recycler/lots', '/recycler/offers']) {
      const res = await app.inject({ method: 'GET', url, headers: auth(collector) });
      expect(res.statusCode, url).toBe(403);
    }
  });

  it('refuses every admin route to non-admins', async () => {
    const collector = await signIn(app, COLLECTOR_PHONE, 'COLLECTOR');
    const adminUrls = [
      '/admin/dashboard',
      '/admin/verification/pending',
      '/admin/lots',
      '/admin/audit',
      '/admin/anomalies',
      '/admin/ai-predictions',
    ];
    for (const url of adminUrls) {
      const res = await app.inject({ method: 'GET', url, headers: auth(collector) });
      expect(res.statusCode, url).toBe(403);
    }
  });

  it('refuses collector writes to an admin session', async () => {
    const admin = await signIn(app, ADMIN_PHONE, 'ADMIN');
    const res = await app.inject({
      method: 'POST',
      url: '/collector/lots',
      headers: auth(admin),
      payload: lotPayload(),
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('SB-9 the server never trusts client-supplied truth', () => {
  it('computes the estimate server-side and ignores any client estimate', async () => {
    const collector = await signIn(app, COLLECTOR_PHONE, 'COLLECTOR');
    const res = await app.inject({
      method: 'POST',
      url: '/collector/lots',
      headers: auth(collector),
      payload: lotPayload({
        // A client trying to dictate its own valuation.
        estimatedValue: 999_999_99,
        pricePerKg: 999_999,
      }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { estimatedValue: number; demo: boolean } }>();
    expect(body.data.estimatedValue).toBeLessThan(999_999);
    expect(body.data.demo).toBe(true);
  });

  it('rejects a lot whose material the collector did not confirm (LOT-06)', async () => {
    const collector = await signIn(app, COLLECTOR_PHONE, 'COLLECTOR');
    const res = await app.inject({
      method: 'POST',
      url: '/collector/lots',
      headers: auth(collector),
      payload: lotPayload({
        items: [
          {
            materialId: 'mat_laptop',
            materialConfirmed: false,
            declaredWeightKg: 12,
            condition: 'GOOD',
            sourceType: 'HOUSEHOLD',
            photoKeys: [],
          },
        ],
      }),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('VALIDATION_FAILED');
  });

  it('rejects a nonsensical weight (VAL-02)', async () => {
    const collector = await signIn(app, COLLECTOR_PHONE, 'COLLECTOR');
    const res = await app.inject({
      method: 'POST',
      url: '/collector/lots',
      headers: auth(collector),
      payload: lotPayload({
        items: [
          {
            materialId: 'mat_laptop',
            materialConfirmed: true,
            declaredWeightKg: -5,
            condition: 'GOOD',
            sourceType: 'HOUSEHOLD',
            photoKeys: [],
          },
        ],
      }),
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a lot with no items', async () => {
    const collector = await signIn(app, COLLECTOR_PHONE, 'COLLECTOR');
    const res = await app.inject({
      method: 'POST',
      url: '/collector/lots',
      headers: auth(collector),
      payload: lotPayload({ items: [] }),
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('SB-3/SB-4 projection boundaries', () => {
  let collector: Session;
  let recycler: Session;

  beforeEach(async () => {
    collector = await signIn(app, COLLECTOR_PHONE, 'COLLECTOR');
    recycler = await signIn(app, RECYCLER_PHONE, 'RECYCLER');
    const created = await app.inject({
      method: 'POST',
      url: '/collector/lots',
      headers: auth(collector),
      payload: lotPayload(),
    });
    const lotId = created.json<{ data: { id: string } }>().data.id;
    await app.inject({
      method: 'POST',
      url: `/collector/lots/${lotId}/submit`,
      headers: auth(collector),
      payload: { idempotencyKey: key() },
    });
  });

  it('never exposes the collector name in a recycler lot projection', async () => {
    const res = await app.inject({ method: 'GET', url: '/recycler/lots', headers: auth(recycler) });
    expect(res.statusCode).toBe(200);
    const raw = res.body;
    expect(raw).not.toContain('Sunita Devi');
    const lots = res.json<{ data: Array<Record<string, unknown>> }>().data;
    for (const lot of lots) {
      expect(lot.collectorName).toBeUndefined();
    }
  });

  it('gives the collector no recycler financials', async () => {
    const res = await app.inject({ method: 'GET', url: '/collector/lots', headers: auth(collector) });
    const lots = res.json<{ data: Array<Record<string, unknown>> }>().data;
    for (const lot of lots) {
      expect(lot.recyclerMargin).toBeUndefined();
      expect(lot.recyclerEarnings).toBeUndefined();
    }
  });
});

describe('error envelope', () => {
  it('never leaks a stack trace or internal detail', async () => {
    const res = await app.inject({ method: 'GET', url: '/collector/lots' });
    expect(res.statusCode).toBe(401);
    const raw = res.body;
    expect(raw).not.toContain('at Object.');
    expect(raw).not.toContain('node_modules');
    expect(raw).not.toContain('.ts:');
  });

  it('returns a normalized 404 for an unknown endpoint', async () => {
    const res = await app.inject({ method: 'GET', url: '/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('NOT_FOUND');
  });

  it('reports which field failed validation', async () => {
    const collector = await signIn(app, COLLECTOR_PHONE, 'COLLECTOR');
    const res = await app.inject({
      method: 'POST',
      url: '/collector/lots',
      headers: auth(collector),
      payload: { items: [], collectionArea: '', idempotencyKey: 'short' },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json<{ error: { code: string; field?: string } }>();
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(body.error.field).toBeTruthy();
  });
});

describe('idempotency is mandatory (FRD-03)', () => {
  it('rejects a lot-creating write with no key', async () => {
    const collector = await signIn(app, COLLECTOR_PHONE, 'COLLECTOR');
    const res = await app.inject({
      method: 'POST',
      url: '/collector/lots',
      headers: auth(collector),
      payload: { ...lotPayload(), idempotencyKey: undefined },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns the original lot when a create is replayed', async () => {
    const collector = await signIn(app, COLLECTOR_PHONE, 'COLLECTOR');
    const sharedKey = key();
    const first = await app.inject({
      method: 'POST',
      url: '/collector/lots',
      headers: auth(collector),
      payload: lotPayload({ idempotencyKey: sharedKey }),
    });
    const second = await app.inject({
      method: 'POST',
      url: '/collector/lots',
      headers: auth(collector),
      payload: lotPayload({ idempotencyKey: sharedKey }),
    });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.json<{ data: { id: string } }>().data.id).toBe(
      first.json<{ data: { id: string } }>().data.id,
    );
  });
});
