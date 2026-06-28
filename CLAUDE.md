# RTCars

Car auction aggregator (like bidcars.com). Scrapes Copart + IAA via Playwright, displays lots with countdown timers, user profiles, favorites, bid history, fee calculator.

## Stack

| | Technology |
|---|---|
| Backend | NestJS + TypeScript, Prisma, PostgreSQL, BullMQ + Redis |
| Frontend | Next.js 16 (App Router), Redux Toolkit (RTK Query), Tailwind + shadcn/ui |
| Scraping | Playwright (browser-based, anti-bot) |
| Auth | @nestjs/jwt + @nestjs/passport, JWT in httpOnly cookies |
| API Docs | @nestjs/swagger → available at `/api/docs` |

## Project Structure

```
RTCars/
├── CLAUDE.md
├── documentation/          # Architecture, DB schema, API reference, decisions
├── backend/src/
│   ├── prisma/             # schema.prisma + migrations
│   ├── scrapers/           # IScraper interface + Copart/IAA implementations
│   │   └── base/           # scraper.interface.ts, base-scraper.ts, scraper-registry.service.ts
│   ├── jobs/               # BullMQ processors + scheduler
│   ├── vehicles/           # REST endpoints + service + DTOs
│   ├── auth/               # JWT strategy, guards, login/register
│   ├── users/              # /me + favorites endpoints
│   ├── fees/               # Copart/IAA fee tables + /fees/calculate
│   └── admin/              # Manual scrape trigger + job history
└── frontend/src/
    ├── app/                # Next.js pages (RSC by default)
    ├── components/         # vehicles/, filters/
    ├── store/              # Redux store + RTK Query (vehiclesApi.ts)
    └── hooks/
```

## Key Commands

```bash
# Infrastructure (run first)
docker compose up -d

# Backend
cd backend && npm run start:dev        # localhost:4000
cd backend && npm run test             # unit tests
cd backend && npm run test:e2e         # e2e tests
npx prisma migrate dev                 # apply schema changes
npx prisma db seed                     # seed Source table
npx prisma studio                      # visual DB browser localhost:5555

# Frontend
cd frontend && npm run dev             # localhost:3000
cd frontend && npm run test            # component tests

# Trigger manual scrape (after backend starts)
curl -X POST http://localhost:4000/api/v1/admin/scrape/copart
```

## Architecture Rules

### NestJS Modules
- Each domain is a NestJS module: `vehicles.module.ts`, `auth.module.ts`, etc.
- Controllers handle HTTP only. Business logic lives in services.
- Use DI everywhere — no `new ServiceName()` outside of tests.
- DTOs use `class-validator` decorators for validation.

### Scraper System
- Every scraper implements `IScraper` from `backend/src/scrapers/base/scraper.interface.ts`.
- `scrape()` must return `AsyncGenerator<VehicleData>` — never a plain array.
- Adding a new source: implement `IScraper`, register in `ScrapersModule`, insert a `Source` DB row. Zero changes to existing code.
- `ScraperRegistryService` is Injectable — inject it, don't import scrapers directly.

### Database
- `Source` is a DB entity (not a string enum). New sources = DB insert.
- Always upsert vehicles on `(sourceId, externalId)` — never insert blindly.
- Record `BidHistory` on each scrape run when `currentBid` changes.
- Schema changes → `npx prisma migrate dev --name <description>` → commit migration.

### Frontend Rendering (Next.js App Router)
- Default = RSC (server component). Add `'use client'` only when needed.
- `AuctionTimer`, `FavoriteButton`, `FeeCalculator`, `BidHistory`, `FilterPanel` are Client Components.
- `FilterPanel` uses URL search params as single source of truth — not local state.
- RTK Query for all API calls. No raw `fetch` in components.

### Auth
- Access token: 15 min, in `Authorization` header.
- Refresh token: 7 days, in httpOnly cookie. Stored in DB for revocation.
- Use `JwtAuthGuard` on protected routes. `@Public()` decorator for open routes.

## Code Conventions
- TypeScript strict mode. No `any`. No `@ts-ignore`.
- Import paths: use absolute paths from `src/` root (configured in tsconfig).
- No `console.log` — use the injected `Logger` service (NestJS) or Pino (backend lib).
- Strings for spec values (`fuelType`, `bodyStyle`, etc.) — not enums — so new scraper sources don't require migrations.

## Agents

Use these sub-agents for focused work:

| Agent | Model | When to use |
|---|---|---|
| `scraper` | sonnet | Building/debugging Playwright scrapers, parsing HTML, implementing `IScraper` |
| `backend` | sonnet | NestJS modules, Prisma schema, BullMQ jobs, REST endpoints |
| `frontend` | sonnet | Next.js pages, React components, Redux slices, RTK Query |
| `ba` | opus | Defining features, user stories, acceptance criteria, MVP scope decisions |
| `docs-writer` | sonnet | Updating documentation in `documentation/`, keeping docs in sync with code |
| `reviewer` | opus | Code review for correctness, architecture compliance, security |
| `tester` | sonnet | Writing Jest/RTL/Playwright tests, coverage checks |
| `devops` | sonnet | Docker Compose, CI/CD, GitHub Actions, production deployment config |

## Commands

| Command | What it does |
|---|---|
| `/new-module [name]` | Scaffolds NestJS module/controller/service/dto boilerplate |
| `/new-source [id]` | Scaffolds files for a new auction source (IScraper boilerplate) |
| `/feature [name]` | BA workflow — creates feature spec in `documentation/features/` |
| `/migrate [name]` | Runs `prisma migrate dev` with given migration name |
| `/seed` | Runs `prisma db seed` (populates Source table) |
| `/check` | TypeScript + ESLint on both backend and frontend |
| `/test [scope]` | Runs tests — `backend`, `frontend`, or a pattern |
| `/review [path]` | Code review on current git diff or specified files |

## Git Workflow

- Branches: `feature/*`, `fix/*`, `refactor/*`, `docs/*`, `chore/*`
- Commits: `type(scope): description` — e.g. `feat(scrapers): add Copart pagination`
- PRs target `develop`, releases go `develop → main`
- **Never run `git push`.** Commit locally when asked; the user pushes manually, always.
- Full guide: `documentation/git-workflow.md`

## Documentation

Full docs in `documentation/`:
- `architecture.md` — structure, rendering strategy, scraper extensibility
- `database-schema.md` — full Prisma schema with field notes
- `api.md` — all REST endpoints with params and response shapes
- `development-setup.md` — how to run locally, env vars, Docker Compose
- `mvp-scope.md` — what's in/out of MVP, 6-week implementation plan
- `decisions.md` — why NestJS over Express, why AsyncGenerator, etc.
- `git-workflow.md` — branching, commit convention, PR process
- `features/` — feature specs (one file per feature, created via `/feature`)
