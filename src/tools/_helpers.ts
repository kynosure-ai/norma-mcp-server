// Shared helpers for tool implementations.
//
// Pattern note: helpers were extracted here on second-use across tools
// ("extract on actual reuse, don't pre-create"). The frontmatter parsers
// below tolerate the empirical shape variations the corpus surfaces:
// some templates use `cross_references` (snake_case), others use
// `crossReference` (camelCase); a handful of aims templates omit the
// `framework` field entirely — slug prefix is the fallback there.

import type { CorpusEntry } from '../types.js';

/** Strip the leading frontmatter block (text between the first pair of `---` lines). */
export function stripFrontmatter(content: string): string {
  // Frontmatter must start at the very top of the file
  if (!content.startsWith('---')) return content;
  const lines = content.split(/\r?\n/);
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) return content;
  return lines.slice(end + 1).join('\n').replace(/^\n+/, '');
}

/** Extract a frontmatter scalar field by name (returns null if missing or no frontmatter). */
function extractFrontmatterField(content: string, field: string): string | null {
  const re = new RegExp(`^${field}:\\s*(.+)$`, 'mi');
  const match = content.match(re);
  if (!match) return null;
  return match[1].trim().replace(/^["']|["']$/g, '');
}

/**
 * Pull the title field out of frontmatter; falls back to the first H1 in the body.
 * Returns null when nothing is parseable.
 */
export function extractTitle(content: string): string | null {
  const fmTitle = extractFrontmatterField(content, 'title');
  if (fmTitle) return fmTitle;
  const h1 = content.match(/^#\s+(.+)$/m);
  return h1 ? h1[1].trim() : null;
}

/**
 * Build a short excerpt of the markdown body around the first occurrence of
 * `needle` (case-insensitive). Falls back to the first chunk of body text if
 * the needle is not in body text. Frontmatter is stripped before searching.
 */
export function extractExcerpt(content: string, needle: string, length: number): string {
  const body = stripFrontmatter(content);
  const idx = body.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) {
    const cleaned = body.replace(/\s+/g, ' ').trim();
    return cleaned.slice(0, length) + (cleaned.length > length ? '…' : '');
  }
  const half = Math.floor(length / 2);
  const start = Math.max(0, idx - half);
  const end = Math.min(body.length, idx + half);
  const slice = body.slice(start, end).replace(/\s+/g, ' ').trim();
  return (start > 0 ? '…' : '') + slice + (end < body.length ? '…' : '');
}

/**
 * Pull every source-reference style citation field out of frontmatter and
 * return a flat string array. Handles all observed corpus shapes:
 * `source_refs`, `sourceRefs`, `regulation_articles`, `iso_clauses`,
 * `directive_articles`, `gdpr_articles`. Both inline arrays and single-line
 * comma-separated strings tolerated.
 */
export function extractSourceRefs(content: string): string[] {
  const fields = [
    'source_refs',
    'sourceRefs',
    'regulation_articles',
    'iso_clauses',
    'directive_articles',
    'gdpr_articles',
  ];
  const refs = new Set<string>();
  for (const field of fields) {
    const inline = content.match(new RegExp(`^${field}:\\s*\\[(.*?)\\]\\s*$`, 'mi'));
    if (inline) {
      for (const item of inline[1].split(',')) {
        const cleaned = item.trim().replace(/^["']|["']$/g, '');
        if (cleaned) refs.add(cleaned);
      }
      continue;
    }
    const block = content.match(new RegExp(`^${field}:\\s*\\n((?:\\s*-\\s*.+\\n?)+)`, 'mi'));
    if (block) {
      for (const line of block[1].split(/\r?\n/)) {
        const m = line.match(/^\s*-\s*(.+?)\s*$/);
        if (m) {
          const cleaned = m[1].replace(/^["']|["']$/g, '');
          if (cleaned) refs.add(cleaned);
        }
      }
      continue;
    }
    const single = extractFrontmatterField(content, field);
    if (single) refs.add(single);
  }
  return Array.from(refs);
}

export interface CrossReference {
  framework: string;
  ref: string;
  confidence?: 'high' | 'medium' | 'low';
}

/**
 * Parse the cross-reference frontmatter block. Supports both
 * `cross_references:` (snake_case, more common) and `crossReference:`
 * (camelCase, used in some EN bcms templates).
 *
 * Tolerated shapes per entry:
 *   - "<framework>: <ref>"   (e.g. "nis2: Art. 21")
 *   - "<framework> -> <ref>" (e.g. "iso27001 -> A.5.15")
 *   - "{ framework: foo, ref: bar }" (inline object)
 */
export function parseCrossReferences(content: string): CrossReference[] {
  const refs: CrossReference[] = [];
  const fields = ['cross_references', 'crossReference', 'crossReferences'];
  for (const field of fields) {
    const block = content.match(new RegExp(`^${field}:\\s*\\n((?:\\s*-\\s*.+\\n?)+)`, 'mi'));
    if (!block) continue;
    for (const line of block[1].split(/\r?\n/)) {
      const trimmed = line.replace(/^\s*-\s*/, '').trim();
      if (!trimmed) continue;
      // Inline object form: { framework: nis2, ref: 'Art. 21', confidence: high }
      const objMatch = trimmed.match(
        /\{\s*framework\s*:\s*["']?([^"',}\s]+)["']?\s*,\s*ref\s*:\s*["']?([^"',}]+?)["']?\s*(?:,\s*confidence\s*:\s*["']?(high|medium|low)["']?)?\s*\}/i,
      );
      if (objMatch) {
        refs.push({
          framework: objMatch[1].toLowerCase(),
          ref: objMatch[2].trim(),
          confidence: objMatch[3]?.toLowerCase() as CrossReference['confidence'],
        });
        continue;
      }
      // "framework -> ref" or "framework: ref"
      const colon = trimmed.match(/^([a-z0-9_-]+)\s*(?:->|:)\s*(.+)$/i);
      if (colon) {
        refs.push({
          framework: colon[1].toLowerCase(),
          ref: colon[2].replace(/^["']|["']$/g, '').trim(),
        });
      }
    }
  }
  return refs;
}

const FRAMEWORK_PREFIX_MAP: Record<string, string> = {
  aims: 'aims',
  isms: 'iso27001',
  pims: 'iso27701',
  bcms: 'iso22301',
  nis2: 'nis2',
  dora: 'dora',
  cra: 'cra',
};

/**
 * Best-effort framework identifier for a corpus entry. Uses the parsed
 * `framework` field first; falls back to the slug prefix (a handful of aims
 * templates omit the `framework` field). The output is lowercased.
 */
export function getFrameworkId(entry: CorpusEntry): string {
  if (entry.framework && entry.framework.toLowerCase() !== 'unknown') {
    return entry.framework.toLowerCase();
  }
  const prefix = entry.slug.split(/[-_/]/)[0]?.toLowerCase() ?? '';
  return FRAMEWORK_PREFIX_MAP[prefix] ?? prefix ?? 'unknown';
}

/**
 * Loose equality between two framework identifiers — tolerates display strings
 * like `"ISO/IEC 27001:2022"` vs the canonical id `"iso27001"`. Both sides are
 * lowercased; substring match in either direction succeeds.
 */
export function frameworkMatches(needle: string, candidate: string): boolean {
  const a = needle.toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export const NOT_LEGAL_ADVICE_DISCLAIMER =
  'Not legal advice. Templates and analyses are derived from public regulatory corpus and Kynosure methodology research. Consult qualified counsel for binding interpretations.';
