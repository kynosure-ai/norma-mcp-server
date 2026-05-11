# Contributing

Thanks for your interest in contributing to this Kynosure project!

## Commit Message Convention

All commits follow [Conventional Commits](https://www.conventionalcommits.org/):

    <type>(<optional-scope>): <subject>

**Types:** `feat` / `fix` / `docs` / `chore` / `refactor` / `test` / `build` / `ci` / `perf` / `style` / `revert`

**Examples:**

- `feat: add ISO 27001 to NIS2 cross-framework mapping`
- `fix: resolve stale corpus cache on tool reload`
- `docs: clarify install command for Claude Code 2.x`

## Local commit-msg hook (optional but recommended)

This repo ships a [lefthook](https://github.com/evilmartians/lefthook) config that validates commit messages locally.

    # Install lefthook (Go binary, no Node.js needed):
    #   macOS:   brew install lefthook
    #   Linux:   curl -1sLf "https://gobinaries.com/evilmartians/lefthook" | sh
    #   Windows: scoop install lefthook  OR  npm i -g lefthook
    lefthook install

After installation, every `git commit` will validate the message against the Conventional Commits format and reject internal development vocabulary.

## About Kynosure

This repository is built and maintained by Kynosure - see [kynosure.ai](https://kynosure.ai) for the broader compliance platform.
