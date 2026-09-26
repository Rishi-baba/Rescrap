/**
 * Client contract and money formatting tests.
 *
 * The rupee/paise boundary is the highest-risk thing in this console: a
 * misplaced conversion factor would show an operator a price 100x off, and
 * would still look like a plausible number. These tests pin it down.
 */
import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from '../src/lib/api';
import { formatMoney, formatWeight, lotStateLabel } from '../src/lib/format';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('formatMoney', () => {
  it('renders integer paise as rupees, never as raw paise', () => {
    expect(formatMoney(123_456)).toBe('INR 1,234.56');
  });

  it('handles zero and sub-rupee amounts', () => {
    expect(formatMoney(0)).toBe('INR 0.00');
    expect(formatMoney(5)).toBe('INR 0.05');
    expect(formatMoney(99)).toBe('INR 0.99');
  });

  it('groups digits the Indian way, because this is an India-first product', () => {
    // 99,999,999 paise = 999,999.99 rupees = 9.99 lakh. Indian grouping is
    // lakh/crore (9,99,999.99), not the US thousands grouping (999,999.99).
    // The app ships en/hi/mr locales, so lakh grouping is the right default.
    // If this assertion ever flips, someone changed the locale, not the amount.
    expect(formatMoney(99_999_999)).toBe('INR 9,99,999.99');
    // Below one lakh the two systems agree, which is why the earlier case passed.
    expect(formatMoney(123_456)).toBe('INR 1,234.56');
  });

  it('renders negatives on the left of the currency', () => {
    expect(formatMoney(-2_050)).toBe('-INR 20.50');
  });

  it('is not off by a factor of 100 in either direction', () => {
    // 100 paise is exactly 1 rupee. If this ever fails, the divisor moved.
    expect(formatMoney(100)).toBe('INR 1.00');
  });
});

describe('formatWeight and labels', () => {
  it('formats kilograms with a unit', () => {
    expect(formatWeight(12)).toBe('12 kg');
    expect(formatWeight(12.456)).toBe('12.46 kg');
  });

  it('turns a state code into a readable label', () => {
    expect(lotStateLabel('PICKUP_SCHEDULED')).toBe('Pickup Scheduled');
    expect(lotStateLabel('DRAFT')).toBe('Draft');
  });
});

describe('ApiClient', () => {
  it('sends the bearer token and unwraps the envelope', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe('http://api.test/admin/dashboard');
      expect((init?.headers as Record<string, string>)['authorization']).toBe('Bearer tok-123');
      return jsonResponse(200, { data: { totalLots: 4 }, demo: true, at: 'now' });
    });
    const client = new ApiClient({
      baseUrl: 'http://api.test/',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      tokens: { accessToken: 'tok-123', refreshToken: 'r' },
    });

    const result = await client.dashboard();
    expect(result.data.totalLots).toBe(4);
    expect(result.demo).toBe(true);
  });

  it('omits the Authorization header on anonymous calls', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>)['authorization']).toBeUndefined();
      return jsonResponse(200, { data: {}, demo: true, at: 'now' });
    });
    const client = new ApiClient({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      tokens: { accessToken: 'tok-123', refreshToken: 'r' },
    });
    await client.meta();
  });

  it('turns a normalized error envelope into an ApiError with its code', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(403, {
        error: { code: 'FORBIDDEN', message: 'Your account does not have access to this.' },
      }),
    );
    const client = new ApiClient({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      tokens: { accessToken: 't', refreshToken: 'r' },
    });

    await expect(client.dashboard()).rejects.toBeInstanceOf(ApiError);
    const error = await client.dashboard().catch((err: ApiError) => err);
    expect(error.code).toBe('FORBIDDEN');
    expect(error.status).toBe(403);
  });

  it('surfaces the failing field on a validation error', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(400, {
        error: { code: 'VALIDATION_FAILED', message: 'Check the form.', field: 'reason' },
      }),
    );
    const client = new ApiClient({ fetchImpl: fetchImpl as unknown as typeof fetch });
    const error = await client.adminLots().catch((err: ApiError) => err);
    expect(error.field).toBe('reason');
  });

  it('does not crash on a non-JSON reply', async () => {
    const fetchImpl = vi.fn(async () => new Response('<html>gateway</html>', { status: 502 }));
    const client = new ApiClient({ fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(client.dashboard()).rejects.toBeInstanceOf(ApiError);
  });

  it('rejects a 200 that is not an envelope', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { unexpected: true }));
    const client = new ApiClient({ fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(client.dashboard()).rejects.toBeInstanceOf(ApiError);
  });

  it('stores tokens after a successful sign-in and clears them on sign-out', async () => {
    const stored: Array<{ accessToken: string; refreshToken: string } | null> = [];
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: {
            accessToken: 'a1',
            refreshToken: 'r1',
            user: { id: 'u1', phone: '+919000000004', role: 'ADMIN', name: 'Demo Admin' },
          },
          demo: true,
          at: 'now',
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { data: {}, demo: true, at: 'now' }));

    const client = new ApiClient({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      onTokens: (tokens) => stored.push(tokens),
    });

    expect(client.hasSession).toBe(false);
    const session = await client.verifyOtp('+919000000004', 'ADMIN', '1234');
    expect(session.user.role).toBe('ADMIN');
    expect(client.hasSession).toBe(true);

    await client.logout();
    expect(client.hasSession).toBe(false);
    expect(stored).toHaveLength(2);
    expect(stored[1]).toBeNull();
  });

  it('clears the local session even when the logout call fails', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(500, { error: { code: 'INTERNAL', message: 'x' } }));
    const client = new ApiClient({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      tokens: { accessToken: 'a', refreshToken: 'r' },
    });
    await client.logout();
    expect(client.hasSession).toBe(false);
  });
});
