---
description: Run Prisma database seed to populate the Source table with Copart and IAA entries.
allowed-tools: Bash(npx *) Bash(npm *)
---

Seed the RTCars database.

```bash
cd /Users/andrewbuli4ka/work/personal/RTCars/backend && npx prisma db seed
```

This populates the `Source` table with:
- `copart` — Copart (US, USD)
- `iaa` — IAA Insurance Auto Auctions (US, USD)

If the seed script doesn't exist yet at `backend/src/prisma/seed.ts`, create it:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.source.upsert({
    where: { id: 'copart' },
    update: {},
    create: {
      id: 'copart',
      name: 'Copart',
      baseUrl: 'https://www.copart.com',
      country: 'US',
      currency: 'USD',
      isActive: true,
    },
  });

  await prisma.source.upsert({
    where: { id: 'iaa' },
    update: {},
    create: {
      id: 'iaa',
      name: 'IAA',
      baseUrl: 'https://www.iaai.com',
      country: 'US',
      currency: 'USD',
      isActive: true,
    },
  });

  console.log('Seeded: copart, iaa');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

And add to `backend/package.json`:
```json
"prisma": {
  "seed": "ts-node src/prisma/seed.ts"
}
```
