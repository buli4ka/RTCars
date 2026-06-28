import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ScrapeRunnerService } from '../scrapers/scrape-runner.service';
import { ScrapeJobData, SCRAPE_QUEUE } from './jobs.constants';

@Processor(SCRAPE_QUEUE)
export class ScrapeProcessor extends WorkerHost {
  private readonly logger = new Logger(ScrapeProcessor.name);

  constructor(private readonly runner: ScrapeRunnerService) {
    super();
  }

  async process(job: Job<ScrapeJobData>): Promise<{ itemsCount: number }> {
    const { sourceSlug } = job.data;
    this.logger.log(`Processing scrape job ${job.id ?? 'unknown'} for "${sourceSlug}"`);
    const result = await this.runner.run(sourceSlug);

    return { itemsCount: result.itemsCount };
  }
}
