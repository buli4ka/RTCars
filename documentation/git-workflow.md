# RTCars — Git Workflow

## Branches

| Branch | Purpose |
|---|---|
| `main` | Production-ready code only. Protected — no direct pushes. |
| `develop` | Integration branch. Features merge here first. |
| `feature/<name>` | New features (`feature/copart-scraper`, `feature/favorites-ui`) |
| `fix/<name>` | Bug fixes (`fix/auction-timer-timezone`) |
| `refactor/<name>` | Refactoring without behaviour change |
| `docs/<name>` | Documentation-only changes |
| `chore/<name>` | Deps, config, CI changes (`chore/update-prisma`) |

## Commit Convention

Format: `type(scope): description`

```
feat(scrapers): add Copart scraper with pagination
fix(vehicles): correct auction timer offset for non-UTC dates
refactor(auth): extract token rotation to separate method
docs(api): update /vehicles query params reference
chore(deps): upgrade Prisma to 5.x
test(vehicles): add service unit tests for filter combinations
```

**Types:** `feat` `fix` `refactor` `docs` `chore` `test` `perf`  
**Scopes:** `scrapers` `vehicles` `auth` `users` `fees` `jobs` `frontend` `deps` `ci` `db`

Keep the description short (under 72 chars), imperative mood ("add" not "added").

## Pull Request Flow

```
feature/my-feature
       │
       ▼
   develop  ← PRs merge here
       │
       ▼  (release)
     main
```

1. Branch off `develop`
2. Make changes, commit with convention above
3. Open PR to `develop` — use the PR template
4. CI must pass (TypeScript, ESLint, tests)
5. At least one review approval
6. Squash merge to `develop`
7. `develop` → `main` via release PR (no squash)

## PR Size

- **Small PRs win** — aim for < 400 lines changed
- One feature per PR. If a feature is large, split by layer (DB schema, API, frontend)
- Never combine unrelated changes in one PR

## What Belongs in a Commit

- One logical change per commit
- Tests for the change in the same commit (not a separate "add tests" commit)
- Migration + schema update in the same commit as the code that uses them

## Release Tagging

```bash
git tag v0.1.0 -m "MVP launch"
git push origin v0.1.0
```

Format: `v{major}.{minor}.{patch}` — semver.
