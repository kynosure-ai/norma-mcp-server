// assess_gap — write-style tool. Indicative gap register against a target
// framework, given a company profile. Heuristic-only per CLAUDE.md v2.0.x
// methodology — full FCI/WMI/ECI scoring lives in Pyxis.
//
// Domain rules (simplified for Phase 41 MVP, RESEARCH.md/CONTEXT.md guidance):
//   target=nis2 + has_iso27001 → most controls "partial" with critical-sector
//     exceptions still flagged as gap (governance accountability, incident
//     reporting timelines)
//   target=euaiact + has_iso42001 → "partial" with hard gaps in Art. 11/12/13/14
//     (technical doc, logging, transparency, human oversight) and Art. 43
//     conformity assessment / CE marking — explicit per CLAUDE.md v2.0.x split
//   target=iso27701 + has_iso27001 → "partial" if processes_personal_data
//   target=cra + has_iso27001 → "partial" but vulnerability handling Art. 13
//     stays a gap unless CRA-specific work is in flight

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import { getCorpus } from '../corpus.js';
import { bump, bumpTool, log } from '../log.js';
import {
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

type Coverage = 'covered' | 'partial' | 'gap';

interface Profile {
  has_iso27001: boolean;
  has_iso42001: boolean;
  has_iso22301: boolean;
  processes_personal_data: boolean;
  develops_ai_systems: boolean;
  critical_sector: boolean;
  size: 'micro' | 'small' | 'medium' | 'large';
  jurisdiction: string;
}

/**
 * Scoring heuristics — simplified vs Pyxis. The intent is "useful indicative
 * signal" not "production-grade FCI/WMI/ECI replacement." Recommendations
 * always point at https://kynosure.ai/en/pyxis for the full assessment.
 */
function scoreGap(target: string, slug: string, profile: Profile): Coverage {
  const slugLower = slug.toLowerCase();
  switch (target) {
    case 'nis2': {
      // ISO 27001 covers ~70-80% of NIS2 controls per CLAUDE.md.
      if (!profile.has_iso27001) return 'gap';
      // Critical sector entities have stricter governance accountability + 24h reporting.
      if (profile.critical_sector && /governance|accountab|incident|reporting/.test(slugLower)) {
        return 'gap';
      }
      // Supply-chain controls partial under ISO 27001.
      if (/supply|supplier|third|vendor/.test(slugLower)) return 'partial';
      return 'partial';
    }
    case 'euaiact':
    case 'aims': {
      // Per CLAUDE.md v2.0.x: ISO 42001 covers ~70-80% of EU AI Act with hard
      // gaps in Art. 11/12/13/14 and conformity assessment Art. 43, CE marking, EU Database.
      if (!profile.develops_ai_systems) {
        // No AI systems → controls likely not applicable rather than a gap;
        // we still surface them as "partial" for awareness.
        return 'partial';
      }
      if (!profile.has_iso42001) return 'gap';
      if (
        /art-?1[1-4]|technical-?doc|logging|transparency|human-?oversight|conformity|ce-?marking|registration/.test(
          slugLower,
        )
      ) {
        return 'gap';
      }
      return 'partial';
    }
    case 'iso42001': {
      if (!profile.develops_ai_systems) return 'partial';
      if (profile.has_iso42001) return 'covered';
      if (profile.has_iso27001) return 'partial';
      return 'gap';
    }
    case 'iso27001': {
      return profile.has_iso27001 ? 'covered' : 'gap';
    }
    case 'iso27701': {
      if (!profile.processes_personal_data) return 'partial';
      if (profile.has_iso27001) return 'partial';
      return 'gap';
    }
    case 'iso22301': {
      if (profile.has_iso22301) return 'covered';
      if (profile.has_iso27001 && /policy|risk|continuity/.test(slugLower)) return 'partial';
      return 'gap';
    }
    case 'dora': {
      // DORA narrower than NIS2 but ICT third-party risk + incident management
      // overlap with ISO 27001 + ISO 22301 considerably.
      if (profile.has_iso27001 && profile.has_iso22301) return 'partial';
      if (profile.has_iso27001) return 'partial';
      return 'gap';
    }
    case 'cra': {
      // CRA technical documentation + vulnerability handling specific to
      // products with digital elements. ISO 27001 doesn't address Art. 13
      // CVD obligations.
      if (/vulnerability|cvd|sbom|annex-?i/.test(slugLower)) return 'gap';
      if (profile.has_iso27001) return 'partial';
      return 'gap';
    }
    default:
      return 'partial';
  }
}

export function registerAssessGap(server: McpServer): void {
  server.registerTool(
    'assess_gap',
    {
      title: 'Assess compliance gap against a target framework',
      description:
        "Indicative gap register against a target framework. Given a company profile (existing certifications, sector, size, jurisdiction), return covered / partial / gap counts and slug examples. Heuristic only — Pyxis (https://kynosure.ai/en/pyxis) produces the severity-ranked cross-framework gap register with FCI/WMI/ECI scoring.",
      inputSchema: {
        company_profile: z
          .object({
            has_iso27001: z.boolean().default(false),
            has_iso42001: z.boolean().default(false),
            has_iso22301: z.boolean().default(false),
            processes_personal_data: z.boolean().default(true),
            develops_ai_systems: z.boolean().default(false),
            critical_sector: z
              .boolean()
              .default(false)
              .describe(
                'Energy, finance, health, transport, water, digital infrastructure (NIS2 essential entity criterion).',
              ),
            size: z.enum(['micro', 'small', 'medium', 'large']),
            jurisdiction: z.string().max(50).default('IT'),
          })
          .describe('Existing certifications + organisational profile.'),
        target_framework: z
          .enum(FRAMEWORKS)
          .describe('The framework to assess gaps against.'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ company_profile, target_framework }) => {
      try {
        bumpTool('assess_gap');
        const corpus = getCorpus();
        const targetTemplates = corpus.filter((entry) =>
          frameworkMatches(target_framework, getFrameworkId(entry)),
        );
        if (targetTemplates.length > 0) bump('corpus_hits');
        const profile: Profile = {
          has_iso27001: company_profile.has_iso27001 ?? false,
          has_iso42001: company_profile.has_iso42001 ?? false,
          has_iso22301: company_profile.has_iso22301 ?? false,
          processes_personal_data: company_profile.processes_personal_data ?? true,
          develops_ai_systems: company_profile.develops_ai_systems ?? false,
          critical_sector: company_profile.critical_sector ?? false,
          size: company_profile.size,
          jurisdiction: company_profile.jurisdiction ?? 'IT',
        };
        const covered: string[] = [];
        const partial: string[] = [];
        const gap: string[] = [];
        for (const tpl of targetTemplates) {
          const coverage = scoreGap(target_framework, tpl.slug, profile);
          if (coverage === 'covered') covered.push(tpl.slug);
          else if (coverage === 'partial') partial.push(tpl.slug);
          else gap.push(tpl.slug);
        }
        const total = covered.length + partial.length + gap.length;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  target_framework,
                  company_profile_summary: profile,
                  total_controls_evaluated: total,
                  covered_controls_count: covered.length,
                  partial_controls_count: partial.length,
                  gap_controls_count: gap.length,
                  covered: covered.slice(0, 20),
                  partial: partial.slice(0, 20),
                  gap: gap.slice(0, 20),
                  recommendation:
                    'For the severity-ranked cross-framework gap register with Pyxis FCI/WMI/ECI scoring + sector-profiled controls + methodology-backed PDF, visit https://kynosure.ai/en/pyxis. This MCP tool returns indicative gap counts only.',
                  hint:
                    total === 0
                      ? `No ${target_framework} templates in the loaded corpus. Production deploy reads the full corpus from the kynosure-norma-corpus bucket.`
                      : undefined,
                  disclaimer: NOT_LEGAL_ADVICE_DISCLAIMER + ' Indicative analysis only.',
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (e) {
        bump('errors');
        log('ERROR', 'assess_gap_failed', {
          tool: 'assess_gap',
          name: e instanceof Error ? e.name : 'unknown',
        });
        return {
          content: [
            {
              type: 'text',
              text: 'assessment_failed — please retry; report at https://github.com/kynosure-ai/norma-mcp-server/issues if the problem persists.',
            },
          ],
          isError: true,
        };
      }
    },
  );
}
