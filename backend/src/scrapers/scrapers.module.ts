import { Module } from '@nestjs/common';
import { CopartScraper } from './copart/copart.scraper';
import { IaaScraper } from './iaa/iaa.scraper';
import { SCRAPERS, ScraperRegistryService } from './base/scraper-registry.service';
import { ScrapeRunnerService } from './scrape-runner.service';

/**
 * Owns the scraper registry and persistence runner.
 *
 * Adding a new source = (1) implement IScraper, (2) add the class to both the
 * providers list and the SCRAPERS `useFactory` args below, (3) insert a Source
 * DB row. No other code changes.
 */
@Module({
  providers: [
    CopartScraper,
    IaaScraper,
    {
      provide: SCRAPERS,
      useFactory: (copart: CopartScraper, iaa: IaaScraper) => [copart, iaa],
      inject: [CopartScraper, IaaScraper],
    },
    ScraperRegistryService,
    ScrapeRunnerService,
  ],
  exports: [ScraperRegistryService, ScrapeRunnerService],
})
export class ScrapersModule {}
