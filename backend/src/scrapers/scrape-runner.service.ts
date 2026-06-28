import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScraperRegistryService } from './base/scraper-registry.service';
import { VehicleData } from './base/scraper.interface';

export interface ScrapeResult {
  jobId: number;
  itemsCount: number;
}

/**
 * Drives a single scrape run: resolves the Source, opens a ScrapeJob, consumes
 * the scraper's async generator, upserts each vehicle on (sourceId, externalId),
 * records BidHistory when currentBid changes, and finalises the ScrapeJob.
 */
@Injectable()
export class ScrapeRunnerService {
  private readonly logger = new Logger(ScrapeRunnerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ScraperRegistryService,
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

    let itemsCount = 0;

    try {
      for await (const vehicle of scraper.scrape()) {
        if (!vehicle.externalId) continue;

        await this.persistVehicle(source.id, vehicle);
        itemsCount += 1;
      }

      await this.prisma.scrapeJob.update({
        where: { id: job.id },
        data: { status: 'completed', finishedAt: new Date(), itemsCount },
      });
      this.logger.log(`Scrape job ${String(job.id)} completed — ${String(itemsCount)} items`);

      return { jobId: job.id, itemsCount };
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

  /** Upsert the vehicle and record a BidHistory row when the bid changed. */
  private async persistVehicle(sourceId: number, data: VehicleData): Promise<void> {
    const existing = await this.prisma.vehicle.findUnique({
      where: { sourceId_externalId: { sourceId, externalId: data.externalId } },
      select: { id: true, currentBid: true },
    });

    const vehicle = await this.prisma.vehicle.upsert({
      where: { sourceId_externalId: { sourceId, externalId: data.externalId } },
      create: { sourceId, ...this.toPersisted(data) },
      update: this.toPersisted(data),
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
