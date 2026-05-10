// Corpus loader — RESEARCH.md Pattern 3.
//
// Production behavior (Cloud Run):
//   - `NORMA_BUCKET` env var set to "kynosure-norma-corpus" (or override).
//   - GCS read via Application Default Credentials from the attached runtime SA
//     (`norma-mcp-runtime@kynosure-ai.iam.gserviceaccount.com`, bucket-scoped
//     `roles/storage.objectViewer` per RESEARCH.md Pattern 3).
//   - Eager-loaded once at module init — cold-start absorbs the GCS download.
//
// Local-dev fallback (Plan 41-04 smoke testing):
//   - The real GCS bucket does not yet exist (Plan 41-02 is blocked on a gcloud
//     auth gate). To allow `node dist/server.js` to boot for structural smoke
//     tests, `NORMA_BUCKET=mock` triggers a filesystem fallback that loads
//     dummy markdown fixtures from `src/__fixtures__/corpus/` (resolved relative
//     to `process.cwd()` — i.e., run the server from the repo root).
//   - This fallback is local-dev only; production unsetting NORMA_BUCKET
//     correctly fails loud at module init, and 41-06 will set it to the real
//     bucket name on Cloud Run deploy.
//
// Fail-loud invariant: if `NORMA_BUCKET` is unset (empty string), throw at
// module init. Cloud Run will refuse to mark the revision healthy and the
// deploy will roll back — the right behavior.

import { Storage } from '@google-cloud/storage';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { CorpusEntry } from './types.js';

const BUCKET = process.env.NORMA_BUCKET ?? '';
if (!BUCKET) {
  throw new Error(
    'NORMA_BUCKET env var must be set (e.g., kynosure-norma-corpus). For local dev set NORMA_BUCKET=mock to load fixtures from src/__fixtures__/corpus/.',
  );
}

const IS_MOCK = BUCKET === 'mock';

let cache: CorpusEntry[] | null = null;

function deriveSlug(filePath: string): string {
  // Strip leading "templates/" prefix (GCS) or fixture-relative prefix, then strip ".md".
  const base = filePath.replace(/^templates\//, '');
  return base.replace(/\.md$/, '');
}

function deriveFramework(content: string): string {
  // Best-effort: parse `framework: <value>` from frontmatter (case-insensitive,
  // multiline). 41-05 may upgrade to a real frontmatter parser if needed.
  const match = content.match(/^framework:\s*(.+)$/m);
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : 'unknown';
}

function deriveSubset(content: string): boolean {
  return /^subset:\s*true\s*$/m.test(content);
}

async function loadFromGcs(): Promise<CorpusEntry[]> {
  const storage = new Storage(); // ADC from attached SA
  const bucket = storage.bucket(BUCKET);
  const [files] = await bucket.getFiles({ prefix: 'templates/' });
  return Promise.all(
    files
      .filter((f) => f.name.endsWith('.md'))
      .map(async (f): Promise<CorpusEntry> => {
        const [buf] = await f.download();
        const content = buf.toString('utf8');
        return {
          name: f.name,
          framework: deriveFramework(content),
          slug: deriveSlug(f.name),
          subset: deriveSubset(content),
          content,
        };
      }),
  );
}

async function loadFromFixtures(): Promise<CorpusEntry[]> {
  // Resolve relative to cwd — caller is expected to `cd C:\dev\norma-mcp-server`
  // before `node dist/server.js`. This is a local-dev smoke shortcut, not prod.
  const fixtureDir = path.resolve(process.cwd(), 'src', '__fixtures__', 'corpus');
  const entries = await fs.readdir(fixtureDir);
  const mdFiles = entries.filter((e) => e.endsWith('.md'));
  return Promise.all(
    mdFiles.map(async (filename): Promise<CorpusEntry> => {
      const fullPath = path.join(fixtureDir, filename);
      const content = await fs.readFile(fullPath, 'utf8');
      const name = `templates/${filename}`;
      return {
        name,
        framework: deriveFramework(content),
        slug: deriveSlug(name),
        subset: deriveSubset(content),
        content,
      };
    }),
  );
}

/**
 * Load + cache the corpus. Idempotent: subsequent calls return the cached
 * array. Should be called once at module init (server.ts top-level await).
 */
export async function loadCorpus(): Promise<CorpusEntry[]> {
  if (cache) return cache;
  cache = IS_MOCK ? await loadFromFixtures() : await loadFromGcs();
  return cache;
}

/** Synchronous accessor — throws if `loadCorpus()` has not yet completed. */
export function getCorpus(): CorpusEntry[] {
  if (!cache) {
    throw new Error('Corpus not loaded — call loadCorpus() first');
  }
  return cache;
}
