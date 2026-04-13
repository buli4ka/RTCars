# RTCars

Car auction aggregator. Scrapes lots from Copart and IAA, displays them with countdown timers, auction history, and a fee calculator. Users can save vehicles and track auctions.

## Stack

- **Backend** — NestJS, Prisma, PostgreSQL, BullMQ + Redis
- **Frontend** — Next.js 16 (App Router), Redux Toolkit, Tailwind + shadcn/ui
- **Scraping** — Playwright (Copart, IAA; extensible to new sources)

## Quick Start

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Backend
cp backend/.env.example backend/.env
cd backend && npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev        # → http://localhost:4000
                         # → http://localhost:4000/api/docs  (Swagger)

# 3. Frontend
cp frontend/.env.local.example frontend/.env.local
cd frontend && npm install
npm run dev              # → http://localhost:3000
```

**Bull Board** (job queue monitor) → http://localhost:3001

## Documentation

See [`documentation/`](documentation/) for full architecture, API reference, DB schema, and development decisions.
