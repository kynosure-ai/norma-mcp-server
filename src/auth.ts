// Authentication + rate-limit middleware — RESEARCH.md §5 + Pitfall 3.
//
// Tier model:
//   - anonymous: no Authorization header → 10/h per IP
//   - api_key:   Authorization: Bearer kyn_xxx (in NORMA_MCP_API_KEYS env, comma-separated) → 100/h per key
//   - invalid:   Bearer with unknown key → 401 + WWW-Authenticate: Bearer
//   - misuse:    Non-Bearer auth scheme → 401
//
// Defense-in-depth: edge layer (Cloudflare Free) is the canonical limiter.
// In-memory `rate-limiter-flexible` here catches misconfigured edges and
// per-instance leaks; multi-instance Cloud Run with min=0 means the in-memory
// counter is best-effort across replicas. That's accepted — the edge enforces.
//
// `NORMA_MCP_API_KEYS=""` (empty) is acceptable for v1.0.0 launch (anonymous-only
// first iteration). 41-07 may rotate to Cloud SQL or Secret Manager.

import type { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { bump, log } from './log.js';

const HOUR_SECONDS = 3600;

const anonymousLimit = new RateLimiterMemory({ points: 10, duration: HOUR_SECONDS });
const apiKeyLimit = new RateLimiterMemory({ points: 100, duration: HOUR_SECONDS });

const validKeys = new Set<string>(
  (process.env.NORMA_MCP_API_KEYS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

/**
 * Express middleware: parse Authorization header and assign req.tier.
 * Sets a truncated apiKey reference on the request for rate-limit keying
 * (full key never logged).
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.header('authorization') ?? '';

  if (auth.startsWith('Bearer ')) {
    const key = auth.slice(7).trim();
    if (!validKeys.has(key)) {
      res.setHeader('WWW-Authenticate', 'Bearer');
      res.status(401).json({ error: 'invalid_api_key' });
      return;
    }
    (req as Request & { tier: 'api_key'; apiKey: string }).tier = 'api_key';
    // Truncated reference — first 8 chars + ellipsis. Used as rate-limit key
    // (NOT logged anywhere except possibly counters which don't carry the value).
    (req as Request & { tier: 'api_key'; apiKey: string }).apiKey = key.slice(0, 8) + '...';
  } else if (auth) {
    // Non-Bearer auth header is a misuse — reject 401.
    res.setHeader('WWW-Authenticate', 'Bearer');
    res.status(401).json({ error: 'unsupported_auth_scheme' });
    return;
  } else {
    (req as Request & { tier: 'anonymous' }).tier = 'anonymous';
  }
  next();
}

/**
 * Express middleware: enforce per-tier rate limits.
 *   - anonymous → 10/h per IP
 *   - api_key   → 100/h per (truncated) key
 * On 429, log a tier-only counter event (no IP, no key).
 */
export async function rateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  bump('requests');
  const tier = (req as Request & { tier: 'anonymous' | 'api_key' }).tier ?? 'anonymous';
  const limiter = tier === 'anonymous' ? anonymousLimit : apiKeyLimit;
  const key =
    tier === 'anonymous'
      ? req.ip ?? '0.0.0.0'
      : (req as Request & { apiKey?: string }).apiKey ?? 'unknown';

  try {
    await limiter.consume(key);
    next();
  } catch {
    bump('rate_limited');
    log('WARNING', 'rate_limit_hit', { tier });
    res.setHeader('Retry-After', String(HOUR_SECONDS));
    res.status(429).json({
      error: 'rate_limit_exceeded',
      tier,
      hint:
        tier === 'anonymous'
          ? 'Sign up at https://kynosure.ai/en/norma/mcp-server for a free API key (100/h)'
          : 'Tier limit reached; wait one hour or contact privacy@kynosure.ai',
    });
  }
}
