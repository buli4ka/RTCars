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

## Progress

Legend: ✅ Done · 🔄 In progress · ⬜ Not started

### Week 1 — Foundation
| Task | Status | Notes |
|---|---|---|
| Docker Compose (Postgres + Redis + Bull Board) | ✅ | `docker-compose.yml` ready |
| NestJS 11 project scaffold | ✅ | pnpm, Node 22, strict TS |
| Prisma schema + migrations | ✅ | Full schema: User, Vehicle, Source, BidHistory, Favorite, ScrapeJob |
| AppModule wiring | ✅ | All modules imported |
| Source seeds (copart, iaa) | ✅ | `prisma/seed.ts`, wired via `prisma.config.ts` |
| Next.js 16 scaffold | ✅ | Tailwind 4, shadcn/ui, Redux RTK Query |
| Figma design | ✅ | Design System, Components, Listing, Detail, Auth, Profile |

### Week 2 — Auth + Users
| Task | Status | Notes |
|---|---|---|
| AuthModule: register, login, refresh, logout | ✅ | Token rotation, httpOnly cookie |
| JWT strategy + JwtAuthGuard + @Public() | ✅ | Global guard, @Public() decorator |
| DTOs with class-validator | ✅ | RegisterDto, LoginDto |
| UsersModule: /me endpoint | ✅ | GET /users/me |
| UsersModule: favorites endpoints | ✅ | GET/POST/DELETE /users/me/favorites/:id |

### Week 3 — Scrapers + Jobs
| Task | Status | Notes |
|---|---|---|
| IScraper interface + VehicleData | ✅ | `scrapers/base/scraper.interface.ts` |
| ScraperRegistryService | ✅ | `scrapers/base/scraper-registry.service.ts` |
| Copart scraper | ✅ | playwright-extra + stealth + US residential proxy; anti-bot gate PASSED (20 lots) |
| IAA scraper | ✅ | DOM-based (server-rendered rows, `title="Label: value"` selectors); 100 lots persisted |
| BullMQ queue + processor | ✅ | `jobs/` — 4h repeatable + manual trigger |
| BidHistory recording on scrape | ✅ | `ScrapeRunnerService` upsert + bid-change tracking |
| Scraper data lifecycle (discover new / refresh bids / expire gone) | ✅ | Bounded pagination + `isActive`/`lastSeenAt` + staleness expiry. Spec: [features/scraper-data-lifecycle.md](features/scraper-data-lifecycle.md). Full-catalog sweep = future |

### Week 4 — Vehicles API + Fees
| Task | Status | Notes |
|---|---|---|
| VehiclesModule: listing + filters + pagination | ⬜ | Stub only |
| Full-text search (tsvector) | ⬜ | |
| GET /vehicles/:id/bid-history | ⬜ | |
| FeesModule: Copart + IAA fee tables | ⬜ | Stub only |
| GET /fees/calculate | ⬜ | |
| AdminModule: manual scrape trigger | ⬜ | Stub only |
| AdminModule: scrape job history | ⬜ | |

### Week 5 — Frontend Core
| Task | Status | Notes |
|---|---|---|
| Redux store + RTK Query wiring | ✅ | vehiclesApi, authApi, StoreProvider |
| Listings page (RSC) + FilterPanel | ⬜ | Placeholder only |
| VehicleCard component | ⬜ | |
| AuctionTimer component | ⬜ | |
| Vehicle detail page | ⬜ | Placeholder only |

### Week 6 — Frontend Features + Polish
| Task | Status | Notes |
|---|---|---|
| FeeCalculator component | ⬜ | |
| BidHistory Recharts graph | ⬜ | |
| Login / Register pages | ⬜ | Placeholder only |
| Profile + Favorites page | ⬜ | Placeholder only |
| End-to-end smoke test | ⬜ | |
