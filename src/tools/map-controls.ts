// map_controls — read-style tool. Cross-framework crosswalk derived from the
// `cross_references` (or `crossReference`) frontmatter blocks of corpus
// templates. RESEARCH.md Pattern 2 + PUBLIC-SUBSET.md framework taxonomy.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import { getCorpus } from '../corpus.js';
import { bump, bumpTool, log } from '../log.js';
import {
  extractTitle,
  frameworkMatches,
  getFrameworkId,
  NOT_LEGAL_ADVICE_DISCLAIMER,
  parseCrossReferences,
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

interface Mapping {
  source: { slug: string; title: string; framework: string };
  target: { framework: string; ref: string };
  confidence: 'high' | 'medium' | 'low';
}

export function registerMapControls(server: McpServer): void {
  server.registerTool(
    'map_controls',
    {
      title: 'Map controls between frameworks',
      description:
        "Crosswalk corpus controls between two compliance frameworks via the `cross_references` frontmatter graph. Useful for prompts like 'I am ISO 27001 certified — what gaps for NIS2?'. Returns an array of mapped pairs with confidence + source slug.",
      inputSchema: {
        from_framework: z
          .enum(FRAMEWORKS)
          .describe('Source framework (e.g., iso27001).'),
        to_framework: z.enum(FRAMEWORKS).describe('Target framework (e.g., nis2).'),
        limit: z.number().int().min(1).max(100).default(20),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ from_framework, to_framework, limit }) => {
      try {
        bumpTool('map_controls');
        if (from_framework === to_framework) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error: 'from_framework and to_framework must differ',
                    hint: 'Use search_controls if you want to browse a single framework.',
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }
        const corpus = getCorpus();
        const max = limit ?? 20;
        const sourceTemplates = corpus.filter((entry) =>
          frameworkMatches(from_framework, getFrameworkId(entry)),
        );
        const mappings: Mapping[] = [];
        for (const tpl of sourceTemplates) {
          const xrefs = parseCrossReferences(tpl.content);
          for (const xref of xrefs) {
            if (frameworkMatches(to_framework, xref.framework)) {
              mappings.push({
                source: {
                  slug: tpl.slug,
                  title: extractTitle(tpl.content) ?? tpl.slug,
                  framework: getFrameworkId(tpl),
                },
                target: { framework: xref.framework, ref: xref.ref },
                confidence: xref.confidence ?? 'medium',
              });
              if (mappings.length >= max) break;
            }
          }
          if (mappings.length >= max) break;
        }
        if (mappings.length > 0) bump('corpus_hits');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  mapping_count: mappings.length,
                  from: from_framework,
                  to: to_framework,
                  mappings,
                  hint:
                    mappings.length === 0
                      ? `No corpus crosswalk available between ${from_framework} and ${to_framework}. The corpus may not yet include cross_references for that pair — try assess_gap for an indicative coverage view.`
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
        log('ERROR', 'map_controls_failed', {
          tool: 'map_controls',
          name: e instanceof Error ? e.name : 'unknown',
        });
        return {
          content: [
            {
              type: 'text',
              text: 'map_failed — please retry; report at https://github.com/kynosure-ai/norma-mcp-server/issues if the problem persists.',
            },
          ],
          isError: true,
        };
      }
    },
  );
}
