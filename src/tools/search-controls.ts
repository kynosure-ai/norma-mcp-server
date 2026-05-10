// search_controls — read-style tool, RESEARCH.md Pattern 2.
//
// Full-text search the in-memory NORMA corpus, optionally filtered by
// framework. Returns hits with title, framework, slug, source_refs, and an
// excerpt centered on the keyword match.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import { getCorpus } from '../corpus.js';
import { bump, bumpTool, log } from '../log.js';
import {
  extractExcerpt,
  extractSourceRefs,
  extractTitle,
  frameworkMatches,
  getFrameworkId,
  NOT_LEGAL_ADVICE_DISCLAIMER,
} from './_helpers.js';

const FRAMEWORKS = [
  'nis2',
  'dora',
  'iso27001',
  'iso42001',
  'aims',
  'euaiact',
  'iso22301',
  'iso27701',
  'cra',
] as const;

export function registerSearchControls(server: McpServer): void {
  server.registerTool(
    'search_controls',
    {
      title: 'Search NORMA controls',
      description:
        'Full-text search the curated NORMA control corpus. Filter by framework (NIS2 / DORA / ISO 27001 / ISO 42001 / EU AI Act / ISO 22301 / ISO 27701 / CRA). Returns matching templates with title, framework, slug, source_refs, and an excerpt around the match.',
      inputSchema: {
        framework: z
          .enum(FRAMEWORKS)
          .optional()
          .describe('Restrict to one framework (omit to search all frameworks).'),
        keyword: z
          .string()
          .min(2)
          .max(200)
          .describe('Search query (matched against title + body, case-insensitive).'),
        limit: z.number().int().min(1).max(50).default(10),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ framework, keyword, limit }) => {
      try {
        bumpTool('search_controls');
        const corpus = getCorpus();
        const needle = keyword.toLowerCase();
        const max = limit ?? 10;
        const hits = corpus
          .filter((entry) => {
            if (!framework) return true;
            return frameworkMatches(framework, getFrameworkId(entry));
          })
          .filter((entry) => {
            const title = extractTitle(entry.content) ?? '';
            return (
              entry.content.toLowerCase().includes(needle) ||
              title.toLowerCase().includes(needle)
            );
          })
          .slice(0, max)
          .map((entry) => ({
            slug: entry.slug,
            framework: getFrameworkId(entry),
            title: extractTitle(entry.content) ?? entry.slug,
            excerpt: extractExcerpt(entry.content, keyword, 220),
            source_refs: extractSourceRefs(entry.content),
            subset: entry.subset,
          }));
        if (hits.length > 0) bump('corpus_hits');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  hits_count: hits.length,
                  query: { framework: framework ?? null, keyword, limit: max },
                  hits,
                  hint:
                    hits.length === 0
                      ? 'No matches in the corpus. Try a broader keyword or omit the framework filter.'
                      : undefined,
                  disclaimer: NOT_LEGAL_ADVICE_DISCLAIMER,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (e) {
        bump('errors');
        log('ERROR', 'search_controls_failed', {
          tool: 'search_controls',
          name: e instanceof Error ? e.name : 'unknown',
        });
        return {
          content: [
            {
              type: 'text',
              text: 'search_failed — please retry; report at https://github.com/kynosure-ai/norma-mcp-server/issues if the problem persists.',
            },
          ],
          isError: true,
        };
      }
    },
  );
}
