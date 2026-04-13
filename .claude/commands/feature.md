---
description: Define a new feature using the BA agent. Creates a feature spec in documentation/features/. Pass the feature name (e.g. /feature price-alerts).
allowed-tools: Write Read Glob
---

Define the feature: **$ARGUMENTS**

## Process

1. Read existing feature specs in `documentation/features/` to understand the format and what's already defined.

2. Read `documentation/mvp-scope.md` to understand current MVP boundaries.

3. Think through the feature from a business analyst perspective:
   - Who is the user?
   - What problem does this solve?
   - What's the simplest version that delivers value?
   - What are the edge cases?
   - Does this change the data model?
   - MVP or post-MVP?

4. Create `documentation/features/$ARGUMENTS.md` with this structure:

```markdown
# Feature: [Human-readable name]

**Status:** Draft | In Progress | Done
**Priority:** MVP | Post-MVP
**Affects:** backend / frontend / scraper / DB schema (list all that apply)

---

## Problem

What user problem does this solve? Why does it matter?

## User Story

As a [type of user], I want [action] so that [benefit].

## Acceptance Criteria

- [ ] ...
- [ ] ...
- [ ] ...

## Edge Cases & Error Scenarios

- What happens when...
- What if the user...

## Out of Scope (for this version)

- ...

## Data Model Impact

If DB schema changes are needed, describe them here.
New fields, new tables, index changes.

## API Changes

New or modified endpoints needed.

## Notes

Design decisions, open questions, references to similar features on bidcars.com or competitors.
```

5. After creating the file, summarize:
   - The key acceptance criteria
   - What layers of the stack are affected
   - Whether it's MVP or post-MVP and why
