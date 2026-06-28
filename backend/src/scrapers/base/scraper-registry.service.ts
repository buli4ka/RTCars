import { Inject, Injectable } from '@nestjs/common';
import { IScraper } from './scraper.interface';

/** DI token holding every registered IScraper implementation. */
export const SCRAPERS = Symbol('SCRAPERS');

/**
 * Indexes all registered scrapers by their sourceSlug. Consumers inject this
 * registry and look scrapers up by slug — they never import scrapers directly,
 * so adding a new source is just adding a provider to the SCRAPERS token.
 */
@Injectable()
export class ScraperRegistryService {
  private readonly bySlug = new Map<string, IScraper>();

  constructor(@Inject(SCRAPERS) scrapers: IScraper[]) {
    for (const scraper of scrapers) {
      this.bySlug.set(scraper.sourceSlug, scraper);
    }
  }

  get(sourceSlug: string): IScraper | undefined {
    return this.bySlug.get(sourceSlug);
  }

  all(): IScraper[] {
    return [...this.bySlug.values()];
  }

  slugs(): string[] {
    return [...this.bySlug.keys()];
  }
}
