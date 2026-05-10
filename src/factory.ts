// Factory for the NORMA McpServer instance.
// Plan 41-04 ships the server scaffolding with NO tools registered.
// Plan 41-05 will import this and call e.g. registerSearchControls(server) etc.
// using `server.registerTool(name, config, cb)` (NOT the deprecated variadic `server.tool(...)`).

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSearchControls } from './tools/search-controls.js';
import { registerMapControls } from './tools/map-controls.js';
import { registerGeneratePolicy } from './tools/generate-policy.js';
import { registerAssessGap } from './tools/assess-gap.js';

/**
 * Build a fresh McpServer per request (stateless transport pattern).
 *
 * Each tool uses `server.registerTool(name, config, handler)` with a raw Zod
 * shape passed via `inputSchema` (per `@modelcontextprotocol/sdk` v1.x
 * signature `inputSchema?: ZodRawShapeCompat`). The deprecated variadic
 * `server.tool(...)` API is not used.
 *
 * Plan 41-05 registers all 4 NORMA tools:
 *   - search_controls   (read-style: keyword + framework filter)
 *   - map_controls      (read-style: cross-framework crosswalk)
 *   - generate_policy   (write-style: template parametrization)
 *   - assess_gap        (write-style: indicative gap register)
 */
export function buildNormaServer(): McpServer {
  const server = new McpServer({
    name: 'norma',
    version: '1.0.0',
  });

  registerSearchControls(server);
  registerMapControls(server);
  registerGeneratePolicy(server);
  registerAssessGap(server);

  return server;
}
