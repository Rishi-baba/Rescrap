/**
 * Authentication and authorization (workflow-and-security.md 4, SB-1/SB-2/SB-9).
 *
 * Two separate steps, deliberately:
 *   1. verifyToken  - proves the caller holds a token we minted
 *   2. read the user record from the store and take the role from THERE
 *
 * Step 2 is what makes a forged role claim useless. The role inside the JWT is
 * used only to look up the user; the stored record is the authority. Rule D-10.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { DemoReScrapService, type Role } from '@rescrap/shared';
import type { ApiConfig } from '../config.js';
import { verifyToken } from '../lib/tokens.js';
import { ApiHttpError } from '../lib/errors.js';

export interface Actor {
  userId: string;
  role: Role;
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Present only after `requireAuth` has run. */
    actor?: Actor;
    /** A service instance bound to this request's identity. */
    svc?: DemoReScrapService;
  }
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

function bearer(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

export function registerAuth(app: FastifyInstance, config: ApiConfig): void {
  app.decorateRequest('actor', undefined);
  app.decorateRequest('svc', undefined);

  app.decorate('requireAuth', async (request: FastifyRequest, _reply: FastifyReply) => {
    const token = bearer(request);
    if (!token) {
      throw new ApiHttpError(401, { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' });
    }

    const verified = verifyToken(token, config.jwtSecret, 'access');
    if (!verified.ok) {
      const expired = 'reason' in verified && verified.reason === 'EXPIRED';
      throw new ApiHttpError(401, {
        code: expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        message: expired
          ? 'Your session has expired. Please sign in again.'
          : 'Your session is not valid. Please sign in again.',
      });
    }

    // Bind a service to this request's identity. The data store stays shared
    // (one Lot, all roles), the session does not.
    const svc = new DemoReScrapService();
    svc.current = { role: verified.claims.role, userId: verified.claims.sub };

    // Re-read the record. The role asserted by the token is discarded here.
    const session = await svc.currentUser();
    if (!session || session.user.id !== verified.claims.sub) {
      throw new ApiHttpError(401, {
        code: 'UNAUTHENTICATED',
        message: 'Please sign in to continue.',
      });
    }

    request.actor = { userId: session.user.id, role: session.user.role };
    request.svc = svc;
  });
}

/** Role gate. Runs after requireAuth. */
export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const actor = request.actor;
    if (!actor) {
      throw new ApiHttpError(401, { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' });
    }
    if (!roles.includes(actor.role)) {
      throw new ApiHttpError(403, {
        code: 'FORBIDDEN',
        message: 'Your account does not have access to this.',
      });
    }
  };
}

/** Narrow a request to an authenticated, authorized one. */
export function actorOf(request: FastifyRequest): Actor {
  if (!request.actor) {
    throw new ApiHttpError(401, { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' });
  }
  return request.actor;
}

export function serviceOf(request: FastifyRequest): DemoReScrapService {
  if (!request.svc) {
    throw new ApiHttpError(401, { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' });
  }
  return request.svc;
}
