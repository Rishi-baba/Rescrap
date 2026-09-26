import { describe, expect, it, vi } from 'vitest';
import { RecyclerApiClient, ApiError } from '../src/lib/api.js';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('RecyclerApiClient', () => {
  it('sends the Bearer token with authenticated requests', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe('http://api.test/recycler/dashboard');
      expect((init?.headers as Headers).get('authorization')).toBe('Bearer test-token-xyz');
      return jsonResponse(200, {
        data: {
          newLotsCount: 5,
          pendingOffersCount: 2,
          activeDealsCount: 1,
          upcomingPickupsCount: 1,
          completedThisMonthCount: 3,
          acceptanceRatePercent: 75,
          recentMatchingLots: [],
          pendingActions: [],
        },
        demo: true,
      });
    });

    const client = new RecyclerApiClient({
      baseUrl: 'http://api.test',
      tokens: { accessToken: 'test-token-xyz', refreshToken: 'ref-123' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const res = await client.getDashboard();
    expect(res.data.newLotsCount).toBe(5);
    expect(res.data.acceptanceRatePercent).toBe(75);
    expect(res.demo).toBe(true);
  });

  it('handles API error envelopes cleanly as ApiError', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(400, {
        error: { code: 'UNVERIFIED_RECYCLER', message: 'Facility verification required' },
      }),
    );

    const client = new RecyclerApiClient({
      baseUrl: 'http://api.test',
      tokens: { accessToken: 'tok', refreshToken: 'ref' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.getDashboard()).rejects.toBeInstanceOf(ApiError);
    const err = (await client.getDashboard().catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe('UNVERIFIED_RECYCLER');
    expect(err.status).toBe(400);
  });

  it('manages tokens correctly during verifyOtp and logout', async () => {
    const stored: unknown[] = [];
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: {
            accessToken: 'acc_1',
            refreshToken: 'ref_1',
            user: { id: 'u2', phone: '+919000000002', role: 'RECYCLER', name: 'Apex Recyclers' },
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { data: { success: true } }));

    const client = new RecyclerApiClient({
      baseUrl: 'http://api.test',
      onTokens: (t) => stored.push(t),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(client.hasSession).toBe(false);
    const session = await client.verifyOtp('+919000000002', '1234');
    expect(session.user.role).toBe('RECYCLER');
    expect(client.hasSession).toBe(true);

    await client.logout();
    expect(client.hasSession).toBe(false);
  });
});
