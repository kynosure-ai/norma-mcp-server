// generate_policy — write-style tool. Parametrize a NORMA template with
// company context and prepend the not-legal-advice (PROV-03) disclaimer.
// RESEARCH.md Pattern 2.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import { getCorpus } from '../corpus.js';
import { bump, bumpTool, log } from '../log.js';
import {
  extractTitle,
  getFrameworkId,
  NOT_LEGAL_ADVICE_DISCLAIMER,
  stripFrontmatter,
} from './_helpers.js';

const POLICY_DISCLAIMER_HEADER = `> **NOT LEGAL ADVICE.** This policy draft is generated from the NORMA compliance corpus by Kynosure. Review with qualified counsel before adopting. The corpus is derived from public regulatory sources and the 2026 Kynosure methodology research; templates are starting points, not binding interpretations.\n\n`;

export function registerGeneratePolicy(server: McpServer): void {
  server.registerTool(
    'generate_policy',
    {
      title: 'Generate policy from NORMA template',
      description:
        'Parametrize a NORMA compliance template with company context and return Markdown. Templates are sourced from the curated corpus (32 in the public subset, 176 more queryable in full). Output begins with a not-legal-advice disclaimer block. Use search_controls first to discover a slug.',
      inputSchema: {
        template_slug: z
          .string()
          .min(3)
          .max(200)
          .describe(
            'Template slug. Use search_controls to discover one. Examples: "iso27001-access-control", "isms-policies-supplier-security".',
          ),
        company_context: z
          .object({
            name: z.string().min(1).max(200).describe('Company / organisation name.'),
            sector: z
              .string()
              .max(100)
              .optional()
              .describe('Industry sector (e.g., financial, healthcare, energy).'),
            size: z
              .enum(['micro', 'small', 'medium', 'large'])
              .optional()
              .describe('EU SME classification.'),
            jurisdiction: z
              .string()
              .max(50)
              .optional()
              .describe('Country/region code, e.g., "IT" or "EU".'),
          })
          .describe('Variables substituted into {{COMPANY_NAME}}, {{SECTOR}}, etc.'),
      },
      annotations: { readOnlyHint: false, idempotentHint: true },
    },
    async ({ template_slug, company_context }) => {
      try {
        bumpTool('generate_policy');
        const corpus = getCorpus();
        const tpl = corpus.find((entry) => entry.slug === template_slug);
        if (!tpl) {
          // Provide a few near-match slugs to help the caller recover.
          const lower = template_slug.toLowerCase();
          const suggestions = corpus
            .filter((entry) => entry.slug.toLowerCase().includes(lower.slice(0, 4)))
            .slice(0, 5)
            .map((entry) => entry.slug);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error: 'template_not_found',
                    requested_slug: template_slug,
                    hint: 'Use search_controls to find a valid slug, then retry.',
                    near_matches: suggestions,
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }
        bump('corpus_hits');
        const body = stripFrontmatter(tpl.content);
        const parametrized = body
          .replace(/\{\{\s*COMPANY_NAME\s*\}\}/g, company_context.name)
          .replace(/\{\{\s*SECTOR\s*\}\}/g, company_context.sector ?? '[sector]')
          .replace(/\{\{\s*SIZE\s*\}\}/g, company_context.size ?? '[size]')
          .replace(
            /\{\{\s*JURISDICTION\s*\}\}/g,
            company_context.jurisdiction ?? '[jurisdiction]',
          );
        const title = extractTitle(tpl.content) ?? template_slug;
        const meta =
          `**Source slug:** \`${tpl.slug}\`\n` +
          `**Framework:** ${getFrameworkId(tpl)}\n` +
          `**Generated for:** ${company_context.name}` +
          (company_context.sector ? ` (${company_context.sector})` : '') +
          (company_context.jurisdiction ? ` — ${company_context.jurisdiction}` : '') +
          `\n\n---\n\n`;
        const policyMarkdown =
          POLICY_DISCLAIMER_HEADER +
          `# ${title}\n\n` +
          meta +
          parametrized +
          `\n\n---\n\n_${NOT_LEGAL_ADVICE_DISCLAIMER}_\n`;
        return {
          content: [{ type: 'text', text: policyMarkdown }],
        };
      } catch (e) {
        bump('errors');
        log('ERROR', 'generate_policy_failed', {
          tool: 'generate_policy',
          name: e instanceof Error ? e.name : 'unknown',
        });
        return {
          content: [
            {
              type: 'text',
              text: 'generation_failed — please retry; report at https://github.com/kynosure-ai/norma-mcp-server/issues if the problem persists.',
            },
          ],
          isError: true,
        };
      }
    },
  );
}
