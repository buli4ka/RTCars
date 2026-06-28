import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { ScraperRegistryService } from '../scrapers/base/scraper-registry.service';
import {
  DEFAULT_SCRAPE_INTERVAL_HOURS,
  MS_PER_HOUR,
  ScrapeJobData,
  SCRAPE_QUEUE,
} from './jobs.constants';

/**
 * On boot, registers a repeatable scrape job for every enabled source. A source
 * is enabled unless `SCRAPE_<SOURCE>_ENABLED=false` (e.g. SCRAPE_COPART_ENABLED).
 * Disabling a source removes its scheduler so it stops re-scraping (useful in
 * dev to avoid burning proxy bandwidth). Job schedulers are keyed by id, so this
 * is idempotent across restarts.
 */
@Injectable()
export class ScrapeScheduler implements OnModuleInit {
  private readonly logger = new Logger(ScrapeScheduler.name);

  constructor(
    @InjectQueue(SCRAPE_QUEUE) private readonly queue: Queue<ScrapeJobData>,
    private readonly registry: ScraperRegistryService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const everyMs = this.intervalHours() * MS_PER_HOUR;

    for (const sourceSlug of this.registry.slugs()) {
      const schedulerId = `scheduled-${sourceSlug}`;

      if (!this.isEnabled(sourceSlug)) {
        await this.queue.removeJobScheduler(schedulerId).catch(() => false);
        this.logger.warn(
          `Scheduled scrape for "${sourceSlug}" disabled (SCRAPE_${sourceSlug.toUpperCase()}_ENABLED=false)`,
        );
        continue;
      }

      await this.queue.upsertJobScheduler(
        schedulerId,
        { every: everyMs },
        {
          name: sourceSlug,
          data: { sourceSlug },
          opts: { removeOnComplete: true, removeOnFail: 50 },
        },
      );
      this.logger.log(
        `Scheduled repeatable scrape for "${sourceSlug}" every ${String(this.intervalHours())}h`,
      );
    }
  }

  /** Enqueue a one-off scrape (used by the admin manual-trigger endpoint). */
  async triggerNow(sourceSlug: string): Promise<string> {
    const job = await this.queue.add(
      `manual-${sourceSlug}`,
      { sourceSlug },
      { removeOnComplete: true, removeOnFail: 50 },
    );

    return job.id ?? `manual-${sourceSlug}`;
  }

  private isEnabled(sourceSlug: string): boolean {
    const flag = this.config.get<string>(`SCRAPE_${sourceSlug.toUpperCase()}_ENABLED`);

    return flag !== 'false';
  }

  private intervalHours(): number {
    const raw = Number(this.config.get<string>('SCRAPE_INTERVAL_HOURS'));

    return raw > 0 ? raw : DEFAULT_SCRAPE_INTERVAL_HOURS;
  }
}
