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
//   GET  /healthz — Cloud Run liveness probe → 200 "ok"
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

// DNS rebinding protection: enabled by default in production, disabled when
// the corpus is in mock mode (local dev) so smoke tests don't have to enumerate
// every Host header variant (`localhost:8080`, `127.0.0.1:8080`, etc.).
const IS_DEV = (process.env.NORMA_BUCKET ?? '') === 'mock';

app.post('/mcp', authenticate, rateLimit, async (req: Request, res: Response) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // STATELESS — multi-instance-safe
      enableDnsRebindingProtection: !IS_DEV,
      allowedHosts: IS_DEV
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

app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).send('ok');
});

app.get('/about', (_req: Request, res: Response) => {
  res.json(getAboutPayload());
});

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  log('INFO', 'server_started', { port });
});
