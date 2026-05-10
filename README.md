# NORMA MCP Server

> **Status:** Bootstrap. v1.0.0 lands when Phase 41 closes.

NORMA — EU compliance corpus across 8 frameworks (NIS2, DORA, ISO 27001, ISO 42001, EU AI Act, ISO 22301, ISO 27701, CRA) — exposed as a free, hosted Model Context Protocol (MCP) server by Kynosure.

This repository is the public source code of the live service running at `https://norma-mcp.kynosure.ai/mcp`. The full install snippet, tool catalogue, and FAQ land here when Phase 41 ships.

## Two doors, same house

NORMA reaches you through two equally first-class distribution surfaces — pick the door that matches your platform and trust posture:

- **[NORMA Claude Skill](https://github.com/kynosure-ai/norma-claude-skill)** — bundled, offline, lives inside Claude Code. The corpus travels with the plugin; install once, use without network. Best when you want a snapshot you control.
- **NORMA MCP Server** (this repo) — live, always-fresh, observable, works from any MCP client (Claude Code, Cursor, Claude Desktop, custom clients). Best when you want the freshest corpus and don't mind a network call.

Neither is hierarchical. Neither is the "real" version. Same corpus, different delivery.

See the catalogue page for the side-by-side decision matrix:
- IT: <https://kynosure.ai/it/norma/mcp-server?utm_source=norma-mcp-server-readme&utm_medium=github&utm_campaign=norma-launch>
- EN: <https://kynosure.ai/en/norma/mcp-server?utm_source=norma-mcp-server-readme&utm_medium=github&utm_campaign=norma-launch>

## Privacy

This server logs counters only — never inputs, never request bodies, never IPs beyond the rate-limit bucket. The privacy posture is verifiable, not just stated:

- **Privacy policy:** <https://kynosure.ai/en/norma/mcp-privacy>
- **Source code is the audit trail** — see `src/log.ts` (lands in Phase 41-04) for the counter-only logger. Anyone can `git clone` and verify the privacy promise for themselves.
- "Open code, private data" — the corpus is read at runtime from a private Cloud Storage bucket in the `kynosure-ai` GCP project; the service code is fully public.

## Not legal advice

This software provides compliance template drafting and gap analysis support based on public regulations and standards. It is **not legal advice** and **not a substitute for qualified counsel**. Outputs must be reviewed by qualified legal/compliance professionals before use in production environments. See `LICENSE` for the full disclaimer.

## Provenance

The NORMA corpus origin, license posture, and editorial provenance are attested in `PROVENANCE.md`, mirrored byte-identically from the `norma-corpus-v1.0.0` tag in the upstream Kynosure repository. The byte-identical invariant IS the audit trail.

## Roadmap

- **Phase 41-01** (this commit): Repo bootstrap — plugin envelope, manifests, PROVENANCE mirror, placeholder README.
- **Phase 41-04**: Server core code (4 tools: `search_controls`, `generate_policy`, `map_controls`, `assess_gap`).
- **Phase 41-07**: Final README with install snippets, FAQ, and submission to MCP Registry + claudemarketplaces.com.

## License

MIT — see `LICENSE`.

— [Kynosure](https://kynosure.ai)
