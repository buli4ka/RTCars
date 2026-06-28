# Feature: Scraper Data Lifecycle

**Status:** Implemented (bounded). New/refresh/expire all live; pagination is bounded
by `SCRAPE_MAX_PAGES`. Full-catalog sweep across filter partitions remains future work.
**Owner:** Scraper / Backend

## Problem

The scrapers currently fetch only **page 1** of each source's default search and
hand the lots to `ScrapeRunnerService`, which upserts them. This means the system
keeps a small, shifting window of lots fresh but has **no strategy for the full
inventory**: it never discovers new lots beyond page 1, and it never retires lots
that have ended. The scraper service needs an explicit, well-defined data lifecycle.

## Current behavior (baseline)

- ✅ **No duplication** — upsert on `(sourceId, externalId)`; re-seeing a lot updates it.
- ✅ **Bid updates** — on re-scrape the latest `currentBid` is written, and a
  `BidHistory` row is appended when the bid changed.
- ❌ **No discovery** — only page 1 of the default search is read; new inventory
  outside that window is never found.
- ❌ **No expiry** — lots that end / drop off the auction stay in the DB forever; no
  way to tell active from gone. (`Vehicle` has no `isActive`/`lastSeenAt` today.)

## Requirements

The scraper service must manage each lot through three lifecycle states:

### R1 — New entities: discover and insert without duplicating
- Discover lots not yet in the DB and insert them.
- Must never create duplicates — continue upserting on `(sourceId, externalId)`.
- Discovery must go beyond page 1: **paginate** through search results, and **sweep**
  across filter partitions (e.g. auction-date windows, locations/yards, makes) so the
  union approaches full active inventory despite each search's result cap.

### R2 — Existing entities: refresh and track bids
- For lots already stored, update mutable fields (bid, status, auction date, etc.).
- Append a `BidHistory` row only when `currentBid` changes (unchanged → no row).
- Record `lastSeenAt` so the system knows the lot was present in the latest run.

### R3 — Gone entities: mark inactive
- Lots present in the DB but **absent** from the latest sweep of their source must be
  marked inactive (e.g. `isActive = false`) rather than deleted, preserving history.
- Inactive lots are excluded from the public listing API by default.
- **Implemented via staleness** (`SCRAPE_STALE_AFTER_HOURS`, default 72h): lots whose
  `lastSeenAt` is older than the window are marked inactive after each run. Staleness is
  used instead of a per-run seen-set diff because a bounded run does not cover the full
  inventory — active lots are re-observed across runs, gone lots age out. A seen-set diff
  becomes viable once full-catalog sweeps exist.

### R4 — Efficiency within the proxy budget
- The residential proxy is metered, so the service must not blindly re-scrape
  everything. Support two cadences:
  - **Frequent, cheap refresh** of active lots (bids/status).
  - **Periodic full sweep** for new inventory and expiry reconciliation.
- Continue blocking image/media/font requests; prefer the lightest extraction
  (Copart JSON, IAA DOM) already in place.

## Schema impact

`Vehicle` needs new fields (Prisma migration):
- `isActive Boolean @default(true)` — for R3.
- `lastSeenAt DateTime?` — for R2/R3 (drives expiry and "seen this run").

## Acceptance criteria

- A scrape run inserts genuinely new lots and creates zero duplicates on re-run.
- Re-scraping a lot with a changed bid adds exactly one `BidHistory` row; an unchanged
  bid adds none.
- After a full sweep, lots no longer offered by the source are `isActive = false`;
  lots still offered remain `isActive = true` with an updated `lastSeenAt`.
- Discovery retrieves materially more than one page of inventory per source.
- A run's proxy bandwidth stays within budget (measured per run).

## Out of scope (for this feature)

- Vehicle history reports / VIN decoding.
- Image re-hosting.
- Cross-source de-duplication (same car listed on both Copart and IAA).

## Notes / approach (no code yet)

- Keep the `IScraper` contract; discovery (pagination/sweep) lives inside each
  scraper's `scrape()` generator or a thin coordinator above it.
- Expiry (R3) is a reconciliation step in `ScrapeRunnerService` after a full sweep:
  diff stored active lots for the source against the externalIds seen this run.
- Pairs naturally with running the scraper as a background worker against a shared
  (cloud) DB so sweeps run continuously within the bandwidth budget.

See also: [decisions.md](../decisions.md) (scraper anti-bot, per-source extraction),
[architecture.md](../architecture.md).
