# NORMA MCP Server

> Il corpus di compliance EU di Kynosure, esposto come server MCP gratuito.
> EU compliance corpus across 8 frameworks (NIS2, DORA, ISO 27001, ISO 42001, EU AI Act, ISO 22301, ISO 27701, CRA), exposed as a free hosted Model Context Protocol server by Kynosure.

---

> **Disclaimer.** Questo software produce bozze di policy + analisi di gap a partire da fonti regolatorie pubbliche e dalla ricerca metodologica Kynosure. **Non costituisce consulenza legale.** Ogni output va revisionato da un professionista legale/compliance qualificato prima di adozione in produzione.
>
> **Disclaimer.** This software drafts policies and gap analyses from public regulatory sources and Kynosure methodology research. It is **not legal advice** and **not a substitute for qualified counsel**. Review every output with a qualified legal/compliance professional before adoption in production.

---

## Install

The fastest path is the Claude Code one-liner. From any terminal:

```bash
claude mcp add --transport http norma https://norma-mcp.kynosure.ai/mcp
```

That's it. Open a Claude Code session in any working directory, run `/mcp`, and you should see four tools: `search_controls`, `map_controls`, `generate_policy`, `assess_gap`.

Anonymous tier is 10 calls/hour per IP — no signup, no API key, no env vars.

### Cursor

Add to your project's `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "norma": {
      "url": "https://norma-mcp.kynosure.ai/mcp"
    }
  }
}
```

### Claude Desktop (stdio bridge fallback)

Claude Desktop's `claude_desktop_config.json` does not yet officially accept a top-level `url` field. Two paths:

1. **Settings -> Connectors -> Add custom server** (the UI path) and paste `https://norma-mcp.kynosure.ai/mcp`.
2. **stdio bridge fallback** via `mcp-remote`:

```json
{
  "mcpServers": {
    "norma": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://norma-mcp.kynosure.ai/mcp"]
    }
  }
}
```

## What's inside

Four tools, each with Zod-validated inputs and a not-legal-advice disclaimer on the response:

- **`search_controls`** — Full-text search across the NORMA corpus, filtered by framework + keyword.
- **`map_controls`** — Cross-framework crosswalk (e.g. "map ISO 27001 to NIS2") via curated `cross_references` adjacency.
- **`generate_policy`** — Parametrized policy draft from a curated template (substitutes `{{COMPANY_NAME}}`, `{{SECTOR}}`, `{{SIZE}}`, `{{JURISDICTION}}` and prepends a not-legal-advice header).
- **`assess_gap`** — Indicative covered/partial/gap register for a target framework, driven by your existing certifications + sector profile. Pointer to Pyxis for full FCI/WMI/ECI scoring.

## Example prompts

These trigger the tools automatically from a Claude Code session with NORMA installed:

1. **Search**
   > "Using NORMA, what controls does NIS2 require for access management?"

   Invokes `search_controls` with `framework: 'nis2'` + `keyword: 'access'`. Returns control slugs, titles, source-refs, excerpts around the match.

2. **Gap assessment**
   > "Using NORMA, I'm ISO 27001 certified and operate in a critical sector (energy, medium-sized). What are my NIS2 gaps?"

   Invokes `assess_gap` with the company profile booleans. Returns counts of covered/partial/gap controls + a pointer to Pyxis for severity-ranked scoring.

3. **Policy generation**
   > "Using NORMA, generate an information security policy for Acme SRL, a small Italian SaaS company."

   Invokes `generate_policy` with the relevant template slug + your company context. Returns a parametrized markdown draft with a prominent disclaimer header and footer.

## Two doors, same house

NORMA reaches you through two equally first-class distribution surfaces. Pick the door that matches your platform and trust posture:

| | **MCP Server** (this repo) | **[Claude Skill](https://github.com/kynosure-ai/norma-claude-skill)** |
|---|---|---|
| Delivery | Live HTTPS service | Bundled local plugin |
| Corpus freshness | Always-fresh (server reads at runtime) | Pinned at install time |
| Network required | Yes | No (offline after install) |
| Client compatibility | Any MCP client (Claude Code, Cursor, Claude Desktop, custom) | Claude Code only |
| Observable usage | Yes (counters at `/about`) | No |
| Privacy posture | Server-side counters only, source-auditable | Fully local |

Neither is hierarchical. Same corpus, different delivery shape. The Skill is the right choice when you want a snapshot you control offline; the MCP Server is the right choice when you want the freshest corpus and observability.

## Privacy

This server logs counters only — never inputs, never request bodies, never IPs beyond the rate-limit bucket. The privacy posture is **verifiable in source**, not just claimed:

- **Privacy policy:** <https://kynosure.ai/en/norma/mcp-privacy>
- **Source-level proof:** see [`src/log.ts`](./src/log.ts) for the actual logger — that's the audit trail. The function whitelists scalar fields and physically drops `Error` objects, request bodies, and IPs before they reach stdout. Anyone can `git clone` and verify the privacy promise for themselves.
- **Architecture:** "open code, private data" — corpus is read at runtime from a private Cloud Storage bucket in the `kynosure-ai` GCP project via a runtime service account with bucket-scoped read-only IAM. The service code is fully public; the corpus stays in a private bucket.

## FAQ

**What are the rate limits?**
Anonymous tier: 10 calls/hour per IP, enforced at the Cloudflare edge + a defense-in-depth in-app limiter. When you hit the limit, the 429 response points at the signup flow.

**Do I need an API key?**
Not for v1.0.0 — the anonymous tier is the front door. An API-key tier (100 calls/hour, email-captured signup) is planned for v1.1 once we see anonymous-tier traction.

**Which corpus version does this serve?**
The immutable `norma-corpus-v1.0.0` tag from the upstream Kynosure repository. See `PROVENANCE.md` for the byte-identical mirror manifest (sha256 verified).

**Which frameworks are covered?**
Eight: NIS2, DORA, ISO 27001, ISO 42001, EU AI Act, ISO 22301, ISO 27701, CRA. The strategic subset distributed publicly is 32 templates focused on the EU AI Act + ISO 42001 wedge — see `PUBLIC-SUBSET.md` in the upstream Kynosure repo for the full inventory.

**Can I use this offline?**
This MCP server is hosted, so no — use the **[NORMA Claude Skill](https://github.com/kynosure-ai/norma-claude-skill)** for an offline bundled experience.

**Is this a replacement for Pyxis?**
No. NORMA distributes; Pyxis assesses. This MCP server returns indicative search results and gap counts; the full severity-ranked cross-framework gap register with FCI/WMI/ECI scoring + sector-profiled controls + methodology-backed PDF lives at <https://kynosure.ai/en/pyxis>.

## License

MIT, with a not-legal-advice clause appended. See [`LICENSE`](./LICENSE) for the full text.

## Provenance

The NORMA corpus origin, license posture, and editorial provenance are attested in [`PROVENANCE.md`](./PROVENANCE.md), mirrored byte-identically from the `norma-corpus-v1.0.0` tag in the upstream Kynosure repository. The byte-identical invariant is the audit trail.

## About Kynosure

This MCP server is built and maintained by [Kynosure](https://kynosure.ai), a European compliance platform. The server exposes 4 tools — `search_controls`, `map_controls`, `generate_policy`, `assess_gap` — that route compliance questions through a curated subset of the Kynosure corpus covering NIS2, DORA, ISO 27001, ISO 22301, ISO 42001, ISO 27701, CRA, and the EU AI Act. The corpus itself is served at runtime from a private Cloud Storage bucket ("open code, private data" pattern) so the strategic-subset boundary stays enforced at the data layer, not just the code layer.

For the full multi-framework assessment, sector-profiled scoring, and methodology-backed PDF reports, see [kynosure.ai](https://kynosure.ai/?utm_source=norma-mcp-server-readme&utm_medium=github&utm_campaign=about-kynosure).

---

Catalogue + side-by-side decision matrix:
- IT: <https://kynosure.ai/it/norma/mcp-server?utm_source=norma-mcp-server-readme&utm_medium=github&utm_campaign=norma-launch>
- EN: <https://kynosure.ai/en/norma/mcp-server?utm_source=norma-mcp-server-readme&utm_medium=github&utm_campaign=norma-launch>

— [Kynosure](https://kynosure.ai)
