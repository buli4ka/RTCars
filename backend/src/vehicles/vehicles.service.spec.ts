import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { type QueryVehiclesDto } from './dto/query-vehicles.dto';
import { VehiclesService } from './vehicles.service';

// ── helpers ──────────────────────────────────────────────────────────────────

function makePrismaMock() {
  return {
    vehicle: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
    bidHistory: { findMany: jest.fn() },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

/** A fully-defaulted query (ValidationPipe would supply these in the real flow). */
function makeQuery(overrides: Partial<QueryVehiclesDto> = {}): QueryVehiclesDto {
  return {
    page: 1,
    limit: 24,
    sortBy: 'auctionDate',
    sortOrder: 'asc',
    ...overrides,
  } as QueryVehiclesDto;
}

// ── suite ─────────────────────────────────────────────────────────────────────

describe('VehiclesService', () => {
  let service: VehiclesService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [VehiclesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);

    prisma.vehicle.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    prisma.vehicle.count.mockResolvedValue(2);
  });

  // ── list ────────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('defaults to active lots only and returns the paginated envelope', async () => {
      const result = await service.list(makeQuery());

      expect(result).toEqual({
        data: [{ id: 1 }, { id: 2 }],
        total: 2,
        page: 1,
        limit: 24,
        totalPages: 1,
      });
      expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
          orderBy: { auctionDate: 'asc' },
          skip: 0,
          take: 24,
        }),
      );
    });

    it('computes skip and totalPages from page/limit', async () => {
      prisma.vehicle.count.mockResolvedValue(50);

      const result = await service.list(makeQuery({ page: 2, limit: 24 }));

      expect(result.totalPages).toBe(3);
      expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 24, take: 24 }),
      );
    });

    it('honours an explicit isActive=false', async () => {
      await service.list(makeQuery({ isActive: false }));

      expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isActive: false }) }),
      );
    });

    it('builds case-insensitive exact and range filters', async () => {
      await service.list(makeQuery({ make: 'ford', yearMin: 2018, yearMax: 2022, sourceId: 1 }));

      const where = prisma.vehicle.findMany.mock.calls[0][0].where;
      expect(where.make).toEqual({ equals: 'ford', mode: 'insensitive' });
      expect(where.year).toEqual({ gte: 2018, lte: 2022 });
      expect(where.sourceId).toBe(1);
    });

    it('maps search to an OR across make/model/trim/lotNumber', async () => {
      await service.list(makeQuery({ search: 'honda' }));

      const where = prisma.vehicle.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { make: { contains: 'honda', mode: 'insensitive' } },
        { model: { contains: 'honda', mode: 'insensitive' } },
        { trim: { contains: 'honda', mode: 'insensitive' } },
        { lotNumber: { contains: 'honda', mode: 'insensitive' } },
      ]);
    });

    it('passes sortBy/sortOrder through to orderBy', async () => {
      await service.list(makeQuery({ sortBy: 'currentBid', sortOrder: 'desc' }));

      expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { currentBid: 'desc' } }),
      );
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the vehicle when found', async () => {
      prisma.vehicle.findUnique.mockResolvedValue({ id: 10, make: 'FORD' });

      await expect(service.findOne(10)).resolves.toEqual({ id: 10, make: 'FORD' });
    });

    it('throws NotFoundException when missing', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── bidHistory ──────────────────────────────────────────────────────────────

  describe('bidHistory', () => {
    it('returns bids for the vehicle ordered ascending', async () => {
      prisma.bidHistory.findMany.mockResolvedValue([{ id: 1, bid: '100', recordedAt: new Date() }]);

      await service.bidHistory(10);

      expect(prisma.bidHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { vehicleId: 10 },
          orderBy: { recordedAt: 'asc' },
        }),
      );
    });
  });
});
