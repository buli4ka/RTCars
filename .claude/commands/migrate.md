---
description: Create and apply a Prisma database migration. Pass a short description as argument (e.g. /migrate add-vehicle-color-field).
allowed-tools: Bash(npx *) Bash(npm *)
---

Run a Prisma migration for the RTCars backend.

Migration name: **$ARGUMENTS**

## Steps

1. Navigate to the backend directory and run the migration:

```bash
cd /Users/andrewbuli4ka/work/personal/RTCars/backend && npx prisma migrate dev --name $ARGUMENTS
```

This will:
- Detect schema changes in `backend/src/prisma/schema.prisma`
- Generate a new migration file in `backend/src/prisma/migrations/`
- Apply the migration to the local database
- Regenerate the Prisma client

2. After migration succeeds, confirm:
- The new migration file was created in `backend/src/prisma/migrations/`
- The Prisma client was regenerated (types updated)

3. If the migration involves a new field that scrapers should populate, remind to update the `VehicleData` interface in `backend/src/scrapers/base/scraper.interface.ts` and the affected scraper parsers.

## If migration name is empty

If no argument was provided, ask: "What should the migration be named? (e.g. add-vehicle-body-style, add-bid-history-index)"
