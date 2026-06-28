import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScrapeScheduler } from '../jobs/scrape.scheduler';

@Injectable()
export class AdminService {
  constructor(
    private readonly scheduler: ScrapeScheduler,
    private readonly prisma: PrismaService,
  ) {}

  /** Enqueue a one-off scrape for the given source slug. */
  async triggerScrape(sourceSlug: string): Promise<{ jobId: string }> {
    const jobId = await this.scheduler.triggerNow(sourceSlug);

    return { jobId };
  }

  /** Recent scrape job history, newest first. */
  jobHistory(limit = 50) {
    return this.prisma.scrapeJob.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: { source: { select: { slug: true, name: true } } },
    });
  }
}
