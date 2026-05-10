// Express + Streamable HTTP transport — RESEARCH.md Pattern 1 + Pitfall 6.
//
// Stateless transport (`sessionIdGenerator: undefined`) — every POST creates a
// fresh transport bound to a fresh McpServer instance. This is multi-instance-safe
// on Cloud Run with min=0.
//
// Endpoints:
//   POST /mcp     — MCP JSON-RPC over Streamable HTTP (auth + rate limit)
//   GET  /mcp     — 405 Method Not Allowed (Pitfall 6: Cursor SSE-fallback bug
//                   mitigation; returning 404 makes Cursor hang instead of
//                   surfacing the error)
//   GET  /health  — liveness probe → 200 "ok" (Cloud Run reserves /healthz
//                   at the GFE layer and 404s before reaching the container,
//                   so we publish on /health instead)
//   GET  /healthz — alias of /health for non-Cloud-Run hosts (unreachable on
//                   Cloud Run because GFE intercepts; harmless duplicate route)
//   GET  /about   — counter exposure + privacy claim (no PII)
//
// Cold-start: corpus eager-loaded at module init (top-level await) — first
// request waits for it, subsequent requests are instant per-instance.

import express from 'express';
import type { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { buildNormaServer } from './factory.js';
import { authenticate, rateLimit } from './auth.js';
import { loadCorpus } from './corpus.js';
import { log, getAboutPayload, bump } from './log.js';

// Eager-load the corpus at module init. Fail loud if it can't load — Cloud Run
// will refuse to mark the revision healthy and the deploy rolls back.
const corpus = await loadCorpus();
log('INFO', 'corpus_loaded', { template_count: corpus.length });

const app = express();
app.use(express.json({ limit: '256kb' }));

// DNS rebinding protection: this defends against attackers tricking a victim's
// browser into reaching a localhost-bound dev server via a rebound DNS record.
// On Cloud Run (always public, never localhost) the threat model doesn't apply
// — and the request's Host header arrives as `<service>-<projectnum>.<region>.run.app`
// for the *.run.app surface and `<custom-domain>` once we wire one, neither of
// which we can enumerate exhaustively at deploy time. We disable the SDK-level
// guard whenever the service is running under Knative (signaled by K_SERVICE)
// and rely on Cloud Run + Cloudflare for Host validation at the edge.
//
// `NORMA_BUCKET=mock` keeps the same dev flag for local smoke testing.
const IS_DEV = (process.env.NORMA_BUCKET ?? '') === 'mock';
const IS_CLOUD_RUN = Boolean(process.env.K_SERVICE);
const DISABLE_DNS_REBINDING_PROTECTION = IS_DEV || IS_CLOUD_RUN;

app.post('/mcp', authenticate, rateLimit, async (req: Request, res: Response) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // STATELESS — multi-instance-safe
      enableDnsRebindingProtection: !DISABLE_DNS_REBINDING_PROTECTION,
      allowedHosts: DISABLE_DNS_REBINDING_PROTECTION
        ? undefined
        : [
            'norma-mcp.kynosure.ai',
            process.env.CLOUD_RUN_HOST ?? '',
          ].filter(Boolean),
    });
    res.on('close', () => {
      transport.close().catch(() => {
        bump('errors');
      });
    });
    const server = buildNormaServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    bump('errors');
    // Privacy invariant: log only error.name (NOT .message — RESEARCH.md Pitfall 2).
    log('ERROR', 'mcp_handler_failed', {
      name: e instanceof Error ? e.name : 'unknown',
    });
    if (!res.headersSent) {
      res.status(500).json({ error: 'internal_error' });
    }
  }
});

// Cursor SSE-fallback bug mitigation — return 405 explicitly, NOT 404.
// (RESEARCH.md Pitfall 6 — surfaces error in Cursor instead of hanging.)
app.get('/mcp', (_req: Request, res: Response) => {
  res.status(405).json({ error: 'method_not_allowed' });
});

// Cloud Run's GFE layer intercepts GET /healthz and 404s before the container
// receives the request. Publish liveness on /health and keep /healthz as a
// non-Cloud-Run alias so smoke tests that target either path keep working.
const healthHandler = (_req: Request, res: Response) => {
  res.status(200).send('ok');
};
app.get('/health', healthHandler);
app.get('/healthz', healthHandler);

app.get('/about', (_req: Request, res: Response) => {
  res.json(getAboutPayload());
});

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  log('INFO', 'server_started', { port });
});
