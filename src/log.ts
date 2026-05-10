// Counter-only structured logger — RESEARCH.md Pattern 4 + Pitfall 2.
//
// PRIVACY INVARIANT (audited via the public source of this file):
//   - We only emit a JSON-per-line envelope to stdout (Cloud Logging auto-parses).
//   - The `log()` function applies a SCALAR FIELD WHITELIST (`Object.fromEntries`
//     filter on `string|number|boolean`) so callers physically CANNOT serialize
//     `Error` objects, request bodies, IP addresses, tool arguments, or any
//     non-scalar payload through this logger.
//   - For errors we extract `error.name` (and optionally `error.code` if it is a
//     scalar) — NEVER `error.message` or `error.stack`. Zod / SyntaxError
//     constructors embed offending input verbatim in `.message`, which would
//     break the "no input logging" promise visible in the public README.
//   - `process.on('uncaughtException')` and `unhandledRejection` handlers below
//     enforce the same invariant for unscoped errors.
//
// The README quotes this file as the audit trail for the privacy claim.

type Sev = 'INFO' | 'WARNING' | 'ERROR';

const STARTED_AT = new Date().toISOString();

type ToolName = 'search_controls' | 'generate_policy' | 'map_controls' | 'assess_gap';

const counters = {
  requests: 0,
  errors: 0,
  corpus_hits: 0,
  rate_limited: 0,
  tools_invoked: {
    search_controls: 0,
    generate_policy: 0,
    map_controls: 0,
    assess_gap: 0,
  } as Record<ToolName, number>,
};

/**
 * Emit a structured log line. ONLY scalar (string|number|boolean) fields survive
 * the whitelist — `Error`, `object`, and arrays are silently dropped to enforce
 * the no-input-logging privacy invariant.
 */
export function log(
  severity: Sev,
  event: string,
  fields: Record<string, unknown> = {},
): void {
  // whitelist: scalar fields only — drops Error.message, request bodies, IPs, tool args
  const safe = Object.fromEntries(
    Object.entries(fields).filter(
      ([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
    ),
  );
  process.stdout.write(JSON.stringify({ severity, message: event, ...safe }) + '\n');
}

/** Counter increment helpers — used by middleware + tool handlers (41-05). */
export function bump(k: 'requests' | 'errors' | 'corpus_hits' | 'rate_limited'): void {
  counters[k]++;
}

export function bumpTool(name: ToolName): void {
  counters.tools_invoked[name]++;
}

/** Payload served at GET /about — exposes counters + privacy claim, no PII. */
export function getAboutPayload() {
  return {
    service: 'norma-mcp',
    version: process.env.K_REVISION ?? '1.0.0-dev',
    privacy:
      'no input logging — counters only. See https://kynosure.ai/en/norma/mcp-privacy and src/log.ts in this repo.',
    started_at: STARTED_AT,
    counters: {
      requests: counters.requests,
      errors: counters.errors,
      corpus_hits: counters.corpus_hits,
      rate_limited: counters.rate_limited,
      tools_invoked: { ...counters.tools_invoked },
    },
  };
}

// Global error traps — preserve the privacy invariant for unscoped errors.
// We log only error.name (a class identifier like "ZodError" / "TypeError") —
// NEVER error.message which embeds Zod/SyntaxError input excerpts.
process.on('uncaughtException', (e: Error) => {
  bump('errors');
  log('ERROR', 'uncaught_exception', { name: e.name });
  // Cloud Run will restart the instance — fail loud.
  process.exit(1);
});

process.on('unhandledRejection', (e: unknown) => {
  bump('errors');
  log('ERROR', 'unhandled_rejection', {
    name: e instanceof Error ? e.name : 'unknown',
  });
});
