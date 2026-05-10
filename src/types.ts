// Shared types for NORMA MCP server.
// 41-05 may extend CorpusEntry with parsed frontmatter shape (sector, owner, summary, etc.).

export interface CorpusEntry {
  /** File path within bucket (e.g., "templates/iso27001/foo.md") or fixture-relative path. */
  name: string;
  /** Derived from frontmatter `framework:` line; falls back to "unknown". */
  framework: string;
  /** Filename without `.md` extension (last path segment). */
  slug: string;
  /** Whether the template is part of the public 32-template subset (frontmatter `subset: true`). */
  subset: boolean;
  /** Raw markdown content including frontmatter. */
  content: string;
}

/** Auth tier assigned by `authenticate()` middleware and consumed by `rateLimit()`. */
export type Tier = 'anonymous' | 'api_key';
