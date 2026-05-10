# NORMA Corpus Provenance

This document attests the public sourcing, license posture, and editorial provenance of the NORMA corpus. It is mirrored byte-identically into the public NORMA distribution artifacts (Claude Skill, MCP Server, Custom GPT) so any consumer can independently verify the corpus origin.

## Sources

The corpus was authored end-to-end during 2026 from the following public references:

- **Regulation (EU) 2024/1689** — EU Artificial Intelligence Act
- **Regulation (EU) 2022/2554** — Digital Operational Resilience Act (DORA)
- **Regulation (EU) 2024/2847** — Cyber Resilience Act (CRA)
- **Regulation (EU) 2016/679** — General Data Protection Regulation (GDPR)
- **Directive (EU) 2022/2555** — NIS2 (Network and Information Security)
- **ISO/IEC 27001:2022** — Information Security Management Systems
- **ISO/IEC 27701:2019** — Privacy Information Management Systems
- **ISO 22301:2019** — Business Continuity Management Systems
- **ISO/IEC 42001:2023** — Artificial Intelligence Management Systems
- **ENISA** — Threat landscape reports and technical guidelines
- **NIST** — AI Risk Management Framework (AI RMF), SP 800-30, Cybersecurity Framework (CSF) 2.0
- **National authorities** — ACN (Italian Cybersecurity Agency), AgID, Garante per la Protezione dei Dati Personali (Italy); Normattiva (Italian official gazette)
- **Sectoral guidance** — EBA Guidelines (GL/2019/02 outsourcing, GL/2019/04 ICT/security risk), ECB Cloud Guide (2025), EIOPA digital operational resilience guidance

Every template's `source_refs` (or framework-equivalent fields such as `regulation_articles`, `iso_clauses`, `directive_articles`, `gdpr_articles`, `cross_references`) anchors specific clauses or articles back to these public sources.

## License Posture

- **Code references** (validator scripts, schema definitions, build tooling): MIT License with attribution
- **Corpus content** (template bodies, frontmatter, structural conventions): CC BY-SA 4.0 — attribution required, derivatives must be shared under the same license
- **Distributed artifacts** (Claude Skill, MCP Server, Custom GPT pack) carry their own LICENSE files reiterating the above split; this PROVENANCE.md is mirrored verbatim into each artifact

The corpus draws from public regulatory and standards material. Regulatory text is itself not subject to copyright; the *synthesis*, *organization*, and *template authoring* are original work and carry the licenses above.

## Employer-Cleanliness Attestation

The corpus was authored by a single maintainer with no current employer and no employer-clients whose policies could have contaminated the material. Every template was drafted from public sources only.

Two audits closed PASS prior to public release:

- **Plan 36-02** — Stratified-sample provenance audit. Ten templates across all seven framework prefixes; 47 of 47 source-references verified as resolvable to the public sources listed above (EUR-Lex CELEX permalinks, ISO clause citations, NIST DOI / direct PDF, ENISA topic pages, Normattiva). User-approved 2026-05-05.
- **Plan 36-03** — Full-corpus employer-cleanliness scan. All 210 archive `.md` files scanned against an 8-pattern bonus-hygiene catalogue (emails, IBAN, codice fiscale, Italian phone, placeholder names, English placeholders, draft markers, P.IVA + 11 digits). Every hit was a deliberate bracketed `[placeholder]` or `{{variable}}` of the corpus's intended template language; zero remediations queued. User-approved 2026-05-05.

Both audit reports are retained in the repository's planning artifacts. Re-running the same hygiene scan against this committed corpus is an integrity check distributable artifacts perform before each release tag.

## Maintenance

The NORMA corpus is maintained as a single-maintainer side-project. Versioning follows clean SemVer:

- **Major** (`vX.0.0`) — structural reorganization or framework family addition / removal
- **Minor** (`vX.Y.0`) — new templates, new mappings, framework methodology updates
- **Patch** (`vX.Y.Z`) — typo fixes, citation corrections, frontmatter adjustments

**Tag immutability policy:** annotated tags `norma-corpus-vX.Y.Z` are never re-pointed once pushed. Corrections always ship as a patch bump on a new tag; existing tags remain stable references for downstream pinning.

Issues, citation corrections, and corpus-improvement suggestions are routed through the public distribution repositories (Claude Skill, MCP Server, GPT pack) and consolidated into the next patch tag.

## Limitations

The corpus provides starting templates and structured guidance. It is **not** legal advice and **not** a substitute for engagement with qualified compliance professionals. Users are responsible for adapting templates to their organizational context, verifying applicability of cited regulations to their jurisdiction and sector, consulting qualified counsel for binding interpretations, and ensuring evidence collection meets their auditor's requirements.
