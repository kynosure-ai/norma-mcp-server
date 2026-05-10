// Factory for the NORMA McpServer instance.
// Plan 41-04 ships the server scaffolding with NO tools registered.
// Plan 41-05 will import this and call e.g. registerSearchControls(server) etc.
// using `server.registerTool(name, config, cb)` (NOT the deprecated variadic `server.tool(...)`).

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSearchControls } from './tools/search-controls.js';
import { registerMapControls } from './tools/map-controls.js';

/**
 * Build a fresh McpServer per request (stateless transport pattern).
 *
 * Each tool uses `server.registerTool(name, config, handler)` with a raw Zod
 * shape passed via `inputSchema` (per `@modelcontextprotocol/sdk` v1.x
 * signature `inputSchema?: ZodRawShapeCompat`). The deprecated variadic
 * `server.tool(...)` API is not used.
 *
 * Plan 41-05 registers `search_controls` + `map_controls` (read-style) here.
 * Plan 41-05 Task 2 will add `generate_policy` + `assess_gap` (write-style).
 */
export function buildNormaServer(): McpServer {
  const server = new McpServer({
    name: 'norma',
    version: '1.0.0',
  });

  registerSearchControls(server);
  registerMapControls(server);

  return server;
}
