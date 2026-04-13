# RTCars — Architecture

## Overview

Car auction aggregator (similar to bidcars.com). Scrapes lots from Copart and IAA, displays them with countdown timers, provides user profiles and favorites. Designed for extensibility — adding new auction sources (Korean auctions, etc.) requires zero changes to existing code.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) |
| Backend | NestJS + TypeScript |
| ORM | Prisma |
| Job Queue | BullMQ + Redis (via @nestjs/bullmq) |
| Database | PostgreSQL |
| Scraping | Playwright |
| UI | Tailwind CSS + shadcn/ui |
| State | Redux Toolkit (RTK Query) |
| Auth | @nestjs/jwt + @nestjs/passport, httpOnly cookies |
| API Docs | @nestjs/swagger (auto-generated OpenAPI) |

---

## Project Structure

```
RTCars/
├── backend/
│   └── src/
│       ├── app.module.ts
│       ├── main.ts                        # Bootstrap, Swagger setup
│       ├── prisma/
│       │   ├── prisma.module.ts
│       │   ├── prisma.service.ts          # PrismaClient singleton
│       │   └── schema.prisma
│       ├── scrapers/
│       │   ├── scrapers.module.ts
│       │   ├── base/
│       │   │   ├── scraper.interface.ts   # IScraper + VehicleData contract
│       │   │   └── base-scraper.ts        # Shared: browser pool, retry, rate limiting
│       │   ├── scraper-registry.service.ts
│       │   ├── copart/
│       │   │   ├── copart.scraper.ts
│       │   │   └── copart.parser.ts
│       │   └── iaa/
│       │       ├── iaa.scraper.ts
│       │       └── iaa.parser.ts
│       ├── jobs/
│       │   ├── jobs.module.ts
│       │   ├── processors/
│       │   │   ├── scrape.processor.ts    # @Processor('scrape')
│       │   │   └── cleanup.processor.ts
│       │   └── jobs.service.ts            # Registers recurring jobs on startup
│       ├── vehicles/
│       │   ├── vehicles.module.ts
│       │   ├── vehicles.controller.ts
│       │   ├── vehicles.service.ts
│       │   └── dto/
│       │       ├── vehicle-query.dto.ts
│       │       └── vehicle.dto.ts
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── strategies/
│       │   │   ├── jwt.strategy.ts
│       │   │   └── jwt-refresh.strategy.ts
│       │   └── guards/jwt-auth.guard.ts
│       ├── users/
│       │   ├── users.module.ts
│       │   ├── users.controller.ts
│       │   └── users.service.ts
│       ├── fees/
│       │   ├── fees.module.ts
│       │   ├── fees.controller.ts
│       │   └── fees.service.ts            # Static Copart/IAA fee tables
│       └── admin/
│           ├── admin.module.ts
│           ├── admin.controller.ts
│           └── admin.guard.ts
└── frontend/
    └── src/
        ├── app/
        │   ├── (auth)/
        │   │   ├── login/page.tsx
        │   │   └── register/page.tsx
        │   ├── vehicles/
        │   │   ├── page.tsx               # RSC — listings, SEO
        │   │   └── [id]/page.tsx          # RSC — detail page
        │   └── profile/
        │       └── favorites/page.tsx
        ├── components/
        │   ├── vehicles/
        │   │   ├── VehicleCard.tsx
        │   │   ├── AuctionTimer.tsx        # 'use client' — setInterval
        │   │   ├── FavoriteButton.tsx      # 'use client' — auth-aware
        │   │   ├── BidHistory.tsx          # 'use client' — Recharts graph
        │   │   └── FeeCalculator.tsx       # 'use client' — interactive
        │   └── filters/
        │       └── FilterPanel.tsx         # 'use client' — URL sync
        ├── store/
        │   ├── index.ts
        │   ├── slices/
        │   │   └── authSlice.ts
        │   └── api/
        │       └── vehiclesApi.ts          # RTK Query
        └── hooks/
            ├── useCountdown.ts
            └── useFeeCalculator.ts
```

---

## Rendering Strategy (Next.js)

| Component | Type | Reason |
|---|---|---|
| `/vehicles` listings page | RSC (server) | SEO, URL-driven filters, initial data |
| `/vehicles/[id]` detail | RSC (server) | SEO |
| `AuctionTimer` | Client | `setInterval` per second |
| `FavoriteButton` | Client | Auth-aware interaction |
| `FilterPanel` | Client | URL sync via `useSearchParams` |
| `FeeCalculator` | Client | Interactive input |
| `BidHistory` chart | Client | Recharts + API fetch |

`FilterPanel` uses URL as single source of truth. On filter change → `router.push` with new params → Next.js re-renders RSC. Back/forward navigation and shareable filter URLs work for free.

---

## Scraper Extensibility

The core architectural principle: **adding a new auction source requires zero changes to existing code.**

```typescript
// scraper.interface.ts
export interface IScraper {
  readonly config: ScraperConfig;
  scrape(): AsyncGenerator<VehicleData>;  // stream, not array
}
```

`AsyncGenerator` allows batch upserts of 50 items at a time without loading all data into memory (Copart has tens of thousands of lots).

To add a new source (e.g. Korean auction):
1. Create `src/scrapers/korea/korea.scraper.ts` implementing `IScraper`
2. Register in `ScrapersModule`
3. Insert a row into the `Source` table

`Source` is a first-class DB entity (not a string enum) — so adding a source is a data operation, not a code change.

---

## Job Flow

```
App startup → jobs.service.ts (OnModuleInit)
  ├── BullMQ repeatable: scrape-copart  (every 4h)
  ├── BullMQ repeatable: scrape-iaa     (every 4h)
  └── BullMQ repeatable: cleanup-expired (every 1h)

scrape.processor.ts
  ├── ScraperRegistryService.get(sourceId)
  ├── ScrapeJob.create({ status: RUNNING })
  ├── for await (vehicle of scraper.scrape())
  │     ├── prisma.vehicle.upsert() — batch of 50
  │     └── prisma.bidHistory.create() — if bid changed
  └── ScrapeJob.update({ status: COMPLETED })
```

---

## Fee Calculator

Copart and IAA charge buyer fees on top of the winning bid. These fee tables are stored as static objects in `fees.service.ts` (they rarely change). The calculator returns a breakdown: `buyerFee`, `titleFee`, `environmentalFee`, `total`.

Frontend `FeeCalculator` component calls `GET /api/v1/fees/calculate?sourceId=copart&bid=5000` and shows the full cost breakdown to the user before they decide to bid.
