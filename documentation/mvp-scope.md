# RTCars — MVP Scope

## What's In

| Feature | Notes |
|---|---|
| Scraping Copart | Playwright, every 4h via BullMQ |
| Scraping IAA | Same pattern |
| Pluggable scraper architecture | New source = 1 file + DB row |
| Listings page with filters | make, model, year, damage, location, sourceId, fuelType, transmission, engine, bodyStyle, driveType, color, keysPresent, runAndDrive |
| Full-text search | PostgreSQL tsvector |
| VIN search | Index on vin field |
| Auction countdown timers | Client component, updates every second |
| User registration + login | Email/password, JWT in httpOnly cookies |
| Saved vehicles (favorites) | Add/remove, view on profile page |
| Bid history chart | Accumulated per scrape run, Recharts on detail page |
| Fee calculator | Static Copart/IAA fee tables, shows total cost |
| Scrape job history | ScrapeJob table, viewable via admin endpoint |
| Swagger API docs | Auto-generated, available at /api/docs |

## What's NOT In (Post-MVP)

| Feature | Why deferred |
|---|---|
| Notifications (email, push, Telegram) | Nice-to-have, adds infra complexity |
| VIN decoder (vehicle history report) | Requires paid API (Carfax, AutoCheck) |
| Vehicle comparison | Low priority for MVP |
| Mobile app | Validate web first |
| Monetization / subscription tiers | Validate idea first |
| Social login (Google, etc.) | Simple email auth sufficient for MVP |
| Image re-hosting / CDN | Use source URLs directly |

---

## Implementation Order (6 Weeks)

**Week 1 — Foundation**
- Docker Compose (Postgres + Redis + Bull Board)
- NestJS project scaffold
- PrismaModule + schema migration
- Source seeds (copart, iaa)
- AppModule wiring

**Week 2 — Auth + Users**
- AuthModule: register, login, refresh, logout
- JWT strategy + guards
- UsersModule: /me, favorites endpoints

**Week 3 — Scrapers + Jobs**
- `IScraper` interface + `BaseScraper`
- `ScraperRegistryService`
- Copart scraper
- IAA scraper
- BullMQ processors + scheduler
- BidHistory recording

**Week 4 — Vehicles API + Fees**
- VehiclesModule: listing with all filters, pagination, full-text, VIN search
- `GET /vehicles/:id/bid-history`
- FeesModule: Copart + IAA fee tables + calculate endpoint
- AdminModule: manual scrape trigger + job history

**Week 5 — Frontend Core**
- Next.js 16 setup: Tailwind, shadcn/ui, Redux store
- Listings page (RSC) + FilterPanel
- VehicleCard + AuctionTimer
- Vehicle detail page

**Week 6 — Frontend Features + Polish**
- FeeCalculator component
- BidHistory Recharts graph
- Login/register pages
- Profile + favorites page
- End-to-end smoke test
