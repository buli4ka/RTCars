import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ScraperRegistryService } from './base/scraper-registry.service';
import { VehicleData } from './base/scraper.interface';
import { DEFAULT_STALE_AFTER_HOURS, HOUR_MS } from './scrapers.constants';

export interface ScrapeResult {
  jobId: number;
  itemsCount: number;
  deactivated: number;
}

/**
 * Drives a single scrape run: resolves the Source, opens a ScrapeJob, consumes
 * the scraper's async generator, and manages each lot's lifecycle —
 * - new: insert (upsert on (sourceId, externalId), never duplicates);
 * - existing: refresh fields, stamp lastSeenAt, append BidHistory on bid change;
 * - gone: lots not re-observed within the stale window are marked isActive=false.
 */
@Injectable()
export class ScrapeRunnerService {
  private readonly logger = new Logger(ScrapeRunnerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ScraperRegistryService,
    private readonly config: ConfigService,
  ) {}

  async run(sourceSlug: string): Promise<ScrapeResult> {
    const scraper = this.registry.get(sourceSlug);

    if (!scraper) {
      throw new NotFoundException(`No scraper registered for "${sourceSlug}"`);
    }

    const source = await this.prisma.source.findUnique({
      where: { slug: sourceSlug },
    });

    if (!source) {
      throw new NotFoundException(`No Source row for slug "${sourceSlug}"`);
    }

    const job = await this.prisma.scrapeJob.create({
      data: { sourceId: source.id, status: 'running' },
    });
    this.logger.log(`Scrape job ${String(job.id)} started for ${sourceSlug}`);

    const seenAt = new Date();
    let itemsCount = 0;

    try {
      for await (const vehicle of scraper.scrape()) {
        if (!vehicle.externalId) continue;

        await this.persistVehicle(source.id, vehicle, seenAt);
        itemsCount += 1;
      }

      const deactivated = await this.expireStale(source.id, seenAt);

      await this.prisma.scrapeJob.update({
        where: { id: job.id },
        data: { status: 'completed', finishedAt: new Date(), itemsCount },
      });
      this.logger.log(
        `Scrape job ${String(job.id)} completed — ${String(itemsCount)} items, ${String(deactivated)} expired`,
      );

      return { jobId: job.id, itemsCount, deactivated };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.scrapeJob.update({
        where: { id: job.id },
        data: { status: 'failed', finishedAt: new Date(), itemsCount, error: message },
      });
      this.logger.error(`Scrape job ${String(job.id)} failed: ${message}`);

      throw error;
    }
  }

  /**
   * Upsert the vehicle, stamp lastSeenAt, (re)activate it, and record a
   * BidHistory row when the bid changed.
   */
  private async persistVehicle(sourceId: number, data: VehicleData, seenAt: Date): Promise<void> {
    const existing = await this.prisma.vehicle.findUnique({
      where: { sourceId_externalId: { sourceId, externalId: data.externalId } },
      select: { id: true, currentBid: true },
    });

    const vehicle = await this.prisma.vehicle.upsert({
      where: { sourceId_externalId: { sourceId, externalId: data.externalId } },
      create: { sourceId, ...this.toPersisted(data), lastSeenAt: seenAt },
      update: { ...this.toPersisted(data), isActive: true, lastSeenAt: seenAt },
      select: { id: true },
    });

    if (data.currentBid != null) {
      const previousBid = existing?.currentBid != null ? Number(existing.currentBid) : undefined;

      if (previousBid !== data.currentBid) {
        await this.prisma.bidHistory.create({
          data: { vehicleId: vehicle.id, bid: data.currentBid },
        });
      }
    }
  }

  /**
   * Mark lots not re-observed within the stale window as inactive. Staleness is
   * used (rather than a per-run seen-set diff) because a run may not cover the
   * source's full inventory — active lots are re-observed across runs, while
   * genuinely gone lots stop being seen and age out.
   */
  private async expireStale(sourceId: number, seenAt: Date): Promise<number> {
    const cutoff = new Date(seenAt.getTime() - this.staleAfterMs());

    const result = await this.prisma.vehicle.updateMany({
      where: { sourceId, isActive: true, lastSeenAt: { lt: cutoff } },
      data: { isActive: false },
    });

    return result.count;
  }

  private staleAfterMs(): number {
    const raw = Number(this.config.get<string>('SCRAPE_STALE_AFTER_HOURS'));
    const hours = raw > 0 ? raw : DEFAULT_STALE_AFTER_HOURS;

    return hours * HOUR_MS;
  }

  /** Map VehicleData onto the Vehicle columns shared by create and update. */
  private toPersisted(data: VehicleData) {
    return {
      externalId: data.externalId,
      vin: data.vin,
      year: data.year,
      make: data.make,
      model: data.model,
      trim: data.trim,
      bodyStyle: data.bodyStyle,
      color: data.color,
      fuelType: data.fuelType,
      transmission: data.transmission,
      driveType: data.driveType,
      engineSize: data.engineSize,
      odometer: data.odometer,
      damageMain: data.damageMain,
      damageSec: data.damageSec,
      keysPresent: data.keysPresent,
      runAndDrive: data.runAndDrive,
      location: data.location,
      auctionDate: data.auctionDate,
      currentBid: data.currentBid,
      buyNowPrice: data.buyNowPrice,
      imageUrls: data.imageUrls ?? [],
      lotNumber: data.lotNumber,
      auctionUrl: data.auctionUrl,
    };
  }
}
