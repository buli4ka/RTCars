---
description: Review current uncommitted or recently changed code using the reviewer agent. Optionally pass a file path or module name to focus the review.
allowed-tools: Bash(git diff *) Bash(git log *) Bash(git status) Read Glob Grep
---

Perform a code review on the current changes.

Focus area (if specified): **$ARGUMENTS**

## Steps

1. Get the current diff:
```bash
git diff HEAD
git diff --cached
git status
```

If `$ARGUMENTS` is provided, also read the relevant files directly for full context.

2. Apply the full reviewer checklist from the `reviewer` agent:

### Architecture checks
- Controllers: HTTP only, no business logic
- Services: all DB calls, no HTTP concerns
- Scrapers: implement `IScraper`, return `AsyncGenerator<VehicleData>`, respect rate limits
- Frontend: `'use client'` only where needed, no raw fetch, FilterPanel uses URL params
- DB: upsert on `(sourceId, externalId)`, paginated queries have `take`/`skip`

### TypeScript checks
- No `any`, no `@ts-ignore` without comment
- No floating promises (unhandled async)
- No unsafe `as` casts on external data

### Security checks
- No hardcoded secrets
- User input goes through DTO validation
- Ownership checks on user resources (favorites, profile)

### Quality checks
- No `console.log` (use Logger/Pino)
- Error paths handled
- No stale TODOs

## Output Format

```
[SEVERITY] path/to/file.ts:line
Issue: what's wrong
Fix: what to do instead
```

**CRITICAL** = security or data integrity issue  
**MAJOR** = architecture violation or broken behaviour  
**MINOR** = quality improvement, non-blocking

End with: "X critical, Y major, Z minor" or "LGTM"
