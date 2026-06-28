import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ScraperRegistryService } from './base/scraper-registry.service';
import { type IScraper, type VehicleData } from './base/scraper.interface';
import { ScrapeRunnerService } from './scrape-runner.service';

// ── helpers ──────────────────────────────────────────────────────────────────

function makePrismaMock() {
  return {
    source: { findUnique: jest.fn() },
    scrapeJob: { create: jest.fn(), update: jest.fn() },
    vehicle: { findUnique: jest.fn(), upsert: jest.fn() },
    bidHistory: { create: jest.fn() },
  };
}

function makeRegistryMock() {
  return { get: jest.fn() };
}

/** A scraper that yields the given vehicles (or throws). */
function fakeScraper(items: VehicleData[], opts: { throwAfter?: number } = {}): IScraper {
  return {
    sourceSlug: 'copart',
    // eslint-disable-next-line @typescript-eslint/require-await
    async *scrape(): AsyncGenerator<VehicleData> {
      let i = 0;

      for (const item of items) {
        if (opts.throwAfter !== undefined && i === opts.throwAfter) {
          throw new Error('scrape boom');
        }

        yield item;
        i += 1;
      }
    },
  };
}

function vehicle(overrides: Partial<VehicleData> = {}): VehicleData {
  return { externalId: 'LOT1', make: 'FORD', ...overrides };
}

// ── suite ─────────────────────────────────────────────────────────────────────

describe('ScrapeRunnerService', () => {
  let service: ScrapeRunnerService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let registry: ReturnType<typeof makeRegistryMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    registry = makeRegistryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScrapeRunnerService,
        { provide: PrismaService, useValue: prisma },
        { provide: ScraperRegistryService, useValue: registry },
      ],
    }).compile();

    service = module.get<ScrapeRunnerService>(ScrapeRunnerService);

    // Sensible defaults for the happy path.
    prisma.source.findUnique.mockResolvedValue({ id: 5 });
    prisma.scrapeJob.create.mockResolvedValue({ id: 1 });
    prisma.scrapeJob.update.mockResolvedValue({});
    prisma.vehicle.findUnique.mockResolvedValue(null);
    prisma.vehicle.upsert.mockResolvedValue({ id: 10 });
    prisma.bidHistory.create.mockResolvedValue({});
  });

  it('throws NotFound when no scraper is registered', async () => {
    registry.get.mockReturnValue();

    await expect(service.run('nope')).rejects.toThrow(NotFoundException);
    expect(prisma.scrapeJob.create).not.toHaveBeenCalled();
  });

  it('throws NotFound when the Source row is missing', async () => {
    registry.get.mockReturnValue(fakeScraper([vehicle()]));
    prisma.source.findUnique.mockResolvedValue(null);

    await expect(service.run('copart')).rejects.toThrow(NotFoundException);
    expect(prisma.scrapeJob.create).not.toHaveBeenCalled();
  });

  it('upserts each vehicle and completes the job', async () => {
    registry.get.mockReturnValue(
      fakeScraper([vehicle({ externalId: 'A' }), vehicle({ externalId: 'B' })]),
    );

    const result = await service.run('copart');

    expect(result).toEqual({ jobId: 1, itemsCount: 2 });
    expect(prisma.vehicle.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.scrapeJob.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ status: 'completed', itemsCount: 2 }),
    });
  });

  it('upserts on the (sourceId, externalId) composite key', async () => {
    registry.get.mockReturnValue(fakeScraper([vehicle({ externalId: 'A' })]));

    await service.run('copart');

    expect(prisma.vehicle.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sourceId_externalId: { sourceId: 5, externalId: 'A' } },
      }),
    );
  });

  it('skips vehicles with an empty externalId', async () => {
    registry.get.mockReturnValue(
      fakeScraper([vehicle({ externalId: '' }), vehicle({ externalId: 'B' })]),
    );

    const result = await service.run('copart');

    expect(result.itemsCount).toBe(1);
    expect(prisma.vehicle.upsert).toHaveBeenCalledTimes(1);
  });

  it('records BidHistory when currentBid is present on a new vehicle', async () => {
    registry.get.mockReturnValue(fakeScraper([vehicle({ currentBid: 500 })]));

    await service.run('copart');

    expect(prisma.bidHistory.create).toHaveBeenCalledWith({
      data: { vehicleId: 10, bid: 500 },
    });
  });

  it('does NOT record BidHistory when the bid is unchanged', async () => {
    prisma.vehicle.findUnique.mockResolvedValue({ id: 10, currentBid: 500 });
    registry.get.mockReturnValue(fakeScraper([vehicle({ currentBid: 500 })]));

    await service.run('copart');

    expect(prisma.bidHistory.create).not.toHaveBeenCalled();
  });

  it('records BidHistory when the bid changed from the stored value', async () => {
    prisma.vehicle.findUnique.mockResolvedValue({ id: 10, currentBid: 400 });
    registry.get.mockReturnValue(fakeScraper([vehicle({ currentBid: 500 })]));

    await service.run('copart');

    expect(prisma.bidHistory.create).toHaveBeenCalledWith({
      data: { vehicleId: 10, bid: 500 },
    });
  });

  it('does NOT record BidHistory when currentBid is absent', async () => {
    registry.get.mockReturnValue(fakeScraper([vehicle({ currentBid: undefined })]));

    await service.run('copart');

    expect(prisma.bidHistory.create).not.toHaveBeenCalled();
  });

  it('marks the job failed and rethrows when the scraper throws', async () => {
    registry.get.mockReturnValue(
      fakeScraper([vehicle({ externalId: 'A' }), vehicle({ externalId: 'B' })], {
        throwAfter: 1,
      }),
    );

    await expect(service.run('copart')).rejects.toThrow('scrape boom');
    expect(prisma.scrapeJob.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ status: 'failed', error: 'scrape boom' }),
    });
  });
});
