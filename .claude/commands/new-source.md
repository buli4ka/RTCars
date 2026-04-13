---
description: Scaffold boilerplate files for a new auction source scraper. Pass the source ID as argument (e.g. /new-source copart-korea).
allowed-tools: Write Bash(mkdir *)
---

Create a new auction source scraper scaffold for source ID: **$ARGUMENTS**

## Steps

### 1. Create the directory and files

Create these files in `backend/src/scrapers/$ARGUMENTS/`:

**`$ARGUMENTS.parser.ts`**
```typescript
import { VehicleData } from '../base/scraper.interface';

export class $ARGUMENTS_PascalCaseParser {
  // TODO: implement HTML/JSON → VehicleData mapping
  parseListItem(raw: unknown): Partial<VehicleData> {
    return {
      // map fields from raw scraped data
    };
  }

  parseDetail(raw: unknown): Partial<VehicleData> {
    return {
      // map additional fields from detail page
    };
  }
}
```

**`$ARGUMENTS.scraper.ts`**
```typescript
import { Injectable } from '@nestjs/common';
import { BaseScraper } from '../base/base-scraper';
import { IScraper, ScraperConfig, VehicleData } from '../base/scraper.interface';
import { $ARGUMENTS_PascalCaseParser } from './$ARGUMENTS.parser';

@Injectable()
export class $ARGUMENTS_PascalCaseScraper extends BaseScraper implements IScraper {
  private readonly parser = new $ARGUMENTS_PascalCaseParser();

  readonly config: ScraperConfig = {
    sourceId: '$ARGUMENTS',
    concurrency: 2,       // adjust based on site limits
    rateLimit: 2000,      // ms between requests
    maxPages: 50,         // cap for testing; remove for production
  };

  async *scrape(): AsyncGenerator<VehicleData> {
    // TODO: implement pagination + detail fetch
    // Example pattern:
    // const page = await this.getPage();
    // for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    //   await page.goto(`${BASE_URL}/search?page=${pageNum}`);
    //   await this.sleep(this.config.rateLimit);
    //   const items = await page.$$eval('...selector...', (els) => els.map(...));
    //   for (const item of items) {
    //     yield { ...this.parser.parseListItem(item), sourceId: this.config.sourceId } as VehicleData;
    //   }
    // }
    throw new Error('$ARGUMENTS scraper not implemented yet');
  }
}
```

### 2. Register in ScrapersModule

Add to `backend/src/scrapers/scrapers.module.ts`:
```typescript
providers: [
  // existing scrapers...
  $ARGUMENTS_PascalCaseScraper,
  // register in ScraperRegistryService.onModuleInit():
  // this.registry.register(this.$ARGUMENTS_camelCaseScraper);
]
```

### 3. Add Source DB seed entry

Add to `backend/src/prisma/seed.ts`:
```typescript
await prisma.source.upsert({
  where: { id: '$ARGUMENTS' },
  update: {},
  create: {
    id: '$ARGUMENTS',
    name: '$ARGUMENTS Display Name',  // TODO: fill in
    baseUrl: 'https://TODO.example.com',
    country: 'TODO',                   // e.g. 'KR', 'US'
    currency: 'TODO',                  // e.g. 'KRW', 'USD'
    isActive: false,                   // enable when scraper is ready
  },
});
```

### 4. Next steps checklist

Print this checklist:
- [ ] Fill in `$ARGUMENTS.parser.ts` — map source HTML/JSON fields to `VehicleData`
- [ ] Fill in `$ARGUMENTS.scraper.ts` — implement pagination and page navigation
- [ ] Investigate the source site: check if it's an SPA, if it has API endpoints, anti-bot measures
- [ ] Update `ScrapersModule` providers array
- [ ] Update seed file with correct `name`, `baseUrl`, `country`, `currency`
- [ ] Run `npx prisma db seed` to insert the Source row
- [ ] Test manually: `POST /api/v1/admin/scrape/$ARGUMENTS`
- [ ] Set `isActive: true` in seed when scraper is working
