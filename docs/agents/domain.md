# Domain Docs

This repository uses a single domain context.

## Reading order

Before exploring or changing a domain area:

1. Read `/CONTEXT.md` for the product vocabulary and boundaries.
2. Read the relevant section of `/CLAUDE.md` for detailed implementation rules.
3. Read applicable decisions under `/docs/adr/` when that directory exists.

Proceed silently when an ADR directory or relevant ADR does not exist.

## Vocabulary

Use the terms defined in `CONTEXT.md` in test names, issues, hypotheses and implementation notes. Do not replace an established domain term with a new synonym.

## Decision conflicts

If proposed work contradicts an existing ADR or an explicit rule in `CLAUDE.md`, surface the conflict instead of silently overriding it.
