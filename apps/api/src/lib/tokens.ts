/**
 * Tokens.
 *
 * Deliberately dependency-free HMAC-SHA256 JWTs (RFC 7519 subset) so the
 * authorization boundary is auditable in one file. Phase 6 may swap in a
 * vetted JOSE library; the token CLAIMS are the contract either way.
 *
 * Rule SB-2 / D-10: the role claim is advisory only. It is re-resolved from
 * the user record on every request, so a tampered or stale token cannot
 * escalate. See auth.ts.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Role } from '@rescrap/shared';

export interface TokenClaims {
  /** Subject: the user id. */
  sub: string;
  role: Role;
  /** Token kind. 'refresh' tokens are never accepted as an access token. */
  typ: 'access' | 'refresh';
  iat: number;
  exp: number;
  /** Token id, so a specific token can be revoked. */
  jti: string;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export function issueToken(
  claims: Omit<TokenClaims, 'iat' | 'exp' | 'jti'>,
  secret: string,
  ttlSeconds: number,
  nowMs: number = Date.now(),
): { token: string; jti: string; expiresInSeconds: number } {
  const iat = Math.floor(nowMs / 1000);
  const exp = iat + ttlSeconds;
  const jti = b64url(createHmac('sha256', secret).update(`${claims.sub}:${nowMs}:${iat}`).digest());
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ ...claims, iat, exp, jti }));
  const body = `${header}.${payload}`;
  return { token: `${body}.${sign(body, secret)}`, jti, expiresInSeconds: ttlSeconds };
}

function verifySignature(body: string, provided: string, secret: string): boolean {
  const expected = sign(body, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export type VerifyFailure = 'MALFORMED' | 'BAD_SIGNATURE' | 'EXPIRED' | 'WRONG_TYPE';

export function verifyToken(
  token: string,
  secret: string,
  expectedType: 'access' | 'refresh',
  nowMs: number = Date.now(),
): { ok: true; claims: TokenClaims } | { ok: false; reason: VerifyFailure } {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { ok: false, reason: 'MALFORMED' };
  }
  const [header, payload, provided] = parts as [string, string, string];
  if (!verifySignature(`${header}.${payload}`, provided, secret)) {
    return { ok: false, reason: 'BAD_SIGNATURE' };
  }

  let claims: TokenClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as TokenClaims;
  } catch {
    return { ok: false, reason: 'MALFORMED' };
  }

  if (claims.typ !== expectedType) {
    return { ok: false, reason: 'WRONG_TYPE' };
  }
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= nowMs) {
    return { ok: false, reason: 'EXPIRED' };
  }
  return { ok: true, claims };
}
