// Factory for the NORMA McpServer instance.
// Plan 41-04 ships the server scaffolding with NO tools registered.
// Plan 41-05 will import this and call e.g. registerSearchControls(server) etc.
// using `server.registerTool(name, config, cb)` (NOT the deprecated variadic `server.tool(...)`).

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Build a fresh McpServer per request (stateless transport pattern).
 *
 * 41-05 registration point — add tool registrations here, e.g.:
 *
 *     import { registerSearchControls } from './tools/search-controls.js';
 *     registerSearchControls(server);
 *
 * Each tool MUST use `server.registerTool(name, { inputSchema: z.object({...}) }, handler)`
 * per RESEARCH.md Pattern 2 (the variadic `server.tool(...)` API is deprecated).
 */
export function buildNormaServer(): McpServer {
  const server = new McpServer({
    name: 'norma',
    version: '1.0.0',
  });

  // Tools land in 41-05 — placeholder until then. tools/list will return [] for now.

  return server;
}
