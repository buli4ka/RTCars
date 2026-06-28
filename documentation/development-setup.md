# RTCars — Development Setup

## Prerequisites

- Node.js 20+
- Docker + Docker Compose
- Git

---

## 1. Start infrastructure

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432`
- **Redis** on `localhost:6379`
- **Bull Board** (job queue UI) on `http://localhost:3001`

---

## 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in secrets
npx prisma migrate dev
npx prisma db seed     # seeds Source table with copart + iaa
npm run start:dev
```

Backend runs on `http://localhost:4000`  
Swagger UI: `http://localhost:4000/api/docs`

---

## 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend runs on `http://localhost:3000`

---

## Environment Variables

### backend/.env.example
```env
DATABASE_URL="postgresql://rtcars:rtcars@localhost:5432/rtcars"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="change-me-in-production"
JWT_REFRESH_SECRET="change-me-in-production-2"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=4000
NODE_ENV=development
```

### frontend/.env.local
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

---

## Docker Compose

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: rtcars
      POSTGRES_USER: rtcars
      POSTGRES_PASSWORD: rtcars
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  bull-board:
    image: deadly0/bull-board
    ports:
      - "3001:3000"
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      - redis

volumes:
  postgres_data:
```

---

## Triggering a Manual Scrape

After seeding the Sources, you can manually kick off a scrape without waiting for the scheduler:

```bash
curl -X POST http://localhost:4000/api/v1/admin/scrape/copart \
  -H "Authorization: Bearer <admin-token>"
```

Watch progress at `http://localhost:3001` (Bull Board).

### Scraper proxy & anti-bot gate

Copart sits behind PerimeterX/HUMAN bot protection, which blocks datacenter IPs. Set a
residential/mobile proxy in `backend/.env` before scraping:

```bash
SCRAPER_PROXY=http://user:pass@host:port
```

To validate that the Copart scraper can get past anti-bot (the go/no-go check for the
whole pipeline), run the standalone gate test — it runs the real scraper without Nest or
the DB and prints the lots it extracts:

```bash
cd backend
npx ts-node --transpile-only scripts/gate-copart.ts
```

`PASS` = real lots returned. `FAIL` = 0 lots / block / timeout (revisit the proxy).

---

## Useful Commands

```bash
# Backend
npx prisma studio              # Visual DB browser at localhost:5555
npx prisma migrate dev         # Apply schema changes
npx prisma db seed             # Re-seed sources

# Check scrape job logs
curl http://localhost:4000/api/v1/admin/scrape-jobs
```
