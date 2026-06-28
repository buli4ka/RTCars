# RTCars — Architectural Decisions

Key choices made and the reasoning behind them. Read this before proposing changes.

---

## Backend: NestJS over Express

**Decision:** NestJS  
**Why:** Express is faster to start but creates structural chaos as the codebase grows. NestJS enforces modules, DI, and separation of concerns from day one. When (if) the idea works and we need to scale the team or split into microservices, the architecture is already there. The initial overhead is worth it for a project intended to grow.

---

## ORM: Prisma

**Decision:** Prisma  
**Why:** Schema-first workflow, auto-generated TypeScript client with perfect types, and excellent migration tooling. Alternatives considered:
- **Drizzle** — faster at runtime, SQL-first syntax; slightly less mature migrations
- **TypeORM** — mature but decorator-heavy, community moving away from it
- **Knex** — query builder only, no schema management

Prisma wins for DX on a TypeScript project.

---

## Scraper Pattern: IScraper + AsyncGenerator

**Decision:** Each scraper implements `IScraper` with a `scrape(): AsyncGenerator<VehicleData>` method.  
**Why:** 
- `AsyncGenerator` streams data instead of loading all lots into memory. Copart has tens of thousands of active lots.
- `IScraper` interface makes all scrapers interchangeable from the job processor's perspective.
- Adding a new source = implement the interface, register in the module. Zero changes to existing code.

---

## Source as DB Entity (not enum)

**Decision:** `Source` is a Prisma model with `id: String @id` (e.g. "copart").  
**Why:** Adding a new auction source should be a data operation, not a deployment. Inserting a row is instant; changing a TypeScript enum requires a code change, migration, and redeploy.

---

## BidHistory via Scraper Runs

**Decision:** Each scrape run records current bid into `BidHistory` if the bid changed.  
**Why:** Copart/IAA don't expose bid history via API. The only way to accumulate it is to snapshot bids on each scrape. 4-hour interval gives reasonable granularity.

---

## Scraper Anti-Bot: playwright-extra + stealth + residential proxy

**Decision:** Scrapers run headless Chromium via `playwright-extra` with
`puppeteer-extra-plugin-stealth`, routed through a US residential proxy (`SCRAPER_PROXY`).
**Why:** Copart (PerimeterX/HUMAN) and IAA block datacenter IPs and headless fingerprints.
Stealth masks `navigator.webdriver`, WebGL, plugins, etc.; a US residential IP makes traffic
look organic. Proven against both sources. Two gotchas worth remembering:
- **Proxy credentials must be passed to Playwright as `{ server, username, password }`** —
  Chromium ignores credentials embedded in the `server` URL and returns HTTP 407. (`curl`
  hides this because it parses URL creds.)
- **Bandwidth:** the base scraper blocks `image`/`media`/`font` resource types (`page.route`)
  so the metered proxy isn't billed for assets we never use (~5–10× saving). Scripts + the
  document still load so the challenge resolves.

---

## Per-Source Extraction: Copart JSON intercept vs IAA DOM scraping

**Decision:** Each scraper picks the most robust extraction strategy for its site, behind the
same `IScraper` interface.
- **Copart:** the search page fires `POST /public/lots/search-results` returning JSON
  (`data.results.content[]`). We intercept that response — structured and resilient.
- **IAA:** results are server-rendered HTML with no JSON API. We parse `.table-row` elements,
  keyed off the stable `title="Label: value"` attributes on each field; auction date comes
  from the watch button's `onclick`.
**Why:** Forcing one strategy on both would be fragile. The interface hides the difference, so
the runner and jobs treat them identically.
Known limitation: IAA title parsing splits multi-word models ("Santa Fe" → model `SANTA`,
trim `FE …`); refine later with a make/model dictionary.

---

## Frontend Rendering: RSC for Listings, Client for Interactivity

**Decision:** Listings page and detail page are React Server Components. Timers, filters, favorites are Client Components.  
**Why:** 
- Listings need SEO — search engines must crawl lot data.
- Timers need `setInterval` — impossible in RSC.
- FilterPanel syncs with URL search params — changes trigger RSC re-render on navigation. Back/forward and link sharing work for free.

---

## State: Redux Toolkit (RTK Query)

**Decision:** Redux Toolkit with RTK Query for API calls.  
**Why:** User is familiar with Redux. RTK Query replaces React Query + manual fetch boilerplate with auto-generated hooks, caching, and invalidation — while staying in the Redux ecosystem.

---

## Auth: JWT in httpOnly Cookies

**Decision:** Access token (15min) + refresh token (7 days) stored in httpOnly cookies.  
**Why:** httpOnly cookies are inaccessible to JavaScript — immune to XSS token theft. Stateless JWTs avoid session storage. Refresh token stored in DB (`RefreshToken` table) allows revocation on logout.

---

## Images: No Re-hosting

**Decision:** Store image URLs from Copart/IAA directly. Don't proxy or re-host.  
**Why:** Saves infrastructure cost and complexity for MVP. Copart/IAA serve their own images. If URLs expire after auction ends, that's acceptable — we mark the vehicle `isActive: false` anyway.

---

## Search: PostgreSQL Full-Text (no Elasticsearch)

**Decision:** Use PostgreSQL `tsvector` for full-text search.  
**Why:** Elasticsearch is heavy operational overhead. PostgreSQL full-text is sufficient for the data volume of 2 sources at MVP stage. Can migrate to Elasticsearch later if needed.

---

## Fee Calculator: Static Tables in Code

**Decision:** Copart and IAA fee tables are static objects in `fees.service.ts`.  
**Why:** These tables change maybe once or twice a year. No need for a DB table or admin UI. When they change, update the code.
