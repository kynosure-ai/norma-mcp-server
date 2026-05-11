---
title: EU AI Act Compliance Checklist (fixture)
subset: true
sector: cross-sector
source_refs: [EU AI Act Reg. 2024/1689 / Art. 9, EU AI Act Reg. 2024/1689 / Art. 11, ISO/IEC 42001:2023 / 6.1.3]
crossReference:
  - aims: 6.1.3 risk treatment
  - iso27001: A.5.15 access control
  - nis2: Art. 21(2)(c) crisis management
---

# EU AI Act Compliance Checklist (fixture)

NORMA MCP server local-development fixture. Note this fixture intentionally
omits the `framework:` frontmatter field to exercise the slug-prefix fallback
(a handful of aims templates in the corpus omit the field — this mirrors that
case).

The fixture also uses `crossReference:` (camelCase) instead of the more common
`cross_references:` (snake_case) — both shapes exist in the corpus, so the
parser must handle both.

## Purpose

Map an organisation's AI system inventory against the EU AI Act risk tiers
(prohibited / high-risk / limited-risk / minimal-risk per Title II Art. 5,
Title III Chapter 2 Art. 6, Title IV Art. 50, recital 27).

## Scope

All AI systems placed on the EU market, put into service in the EU, or whose
output is used in the EU — including providers, deployers, and importers.

## Checklist (excerpt)

- [ ] {{COMPANY_NAME}} has classified each AI system per Art. 6 Annex III
- [ ] Conformity assessment per Art. 43 (high-risk only) initiated
- [ ] Technical documentation per Art. 11 + Annex IV maintained
- [ ] Logging per Art. 12 (high-risk) implemented
- [ ] Human oversight measures per Art. 14 designed
- [ ] Sector context for {{SECTOR}} reviewed against Annex III high-risk areas
