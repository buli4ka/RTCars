import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

// ── helpers ──────────────────────────────────────────────────────────────────

function makePrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
    },
    favorite: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    vehicle: {
      findUnique: jest.fn(),
    },
  };
}

const MOCK_USER = {
  id: 1,
  email: 'user@example.com',
  createdAt: new Date('2024-01-01'),
};

const MOCK_VEHICLE = { id: 10, make: 'Toyota', model: 'Camry' };

const MOCK_FAVORITE = {
  id: 100,
  userId: 1,
  vehicleId: 10,
  createdAt: new Date(),
  vehicle: {
    ...MOCK_VEHICLE,
    source: { slug: 'copart', name: 'Copart' },
  },
};

// ── suite ─────────────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns selected user fields when the user exists', async () => {
      prisma.user.findUnique.mockResolvedValue(MOCK_USER);

      const result = await service.findById(1);

      expect(result).toEqual(MOCK_USER);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, email: true, createdAt: true },
      });
    });

    it('throws NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── getFavorites ──────────────────────────────────────────────────────────

  describe('getFavorites', () => {
    it('returns favorites with vehicle and source included', async () => {
      prisma.favorite.findMany.mockResolvedValue([MOCK_FAVORITE]);

      const result = await service.getFavorites(1);

      expect(result).toEqual([MOCK_FAVORITE]);
      expect(prisma.favorite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1 },
          include: expect.objectContaining({
            vehicle: expect.objectContaining({
              include: expect.objectContaining({ source: expect.anything() }),
            }),
          }),
        }),
      );
    });

    it('returns an empty array when the user has no favorites', async () => {
      prisma.favorite.findMany.mockResolvedValue([]);

      const result = await service.getFavorites(1);

      expect(result).toEqual([]);
    });
  });

  // ── addFavorite ───────────────────────────────────────────────────────────

  describe('addFavorite', () => {
    it('creates and returns the new favorite', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(MOCK_VEHICLE);
      prisma.favorite.findUnique.mockResolvedValue(null);
      prisma.favorite.create.mockResolvedValue(MOCK_FAVORITE);

      const result = await service.addFavorite(1, 10);

      expect(result).toEqual(MOCK_FAVORITE);
      expect(prisma.favorite.create).toHaveBeenCalledWith({
        data: { userId: 1, vehicleId: 10 },
      });
    });

    it('throws NotFoundException when the vehicle does not exist', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(null);

      await expect(service.addFavorite(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the favorite already exists', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(MOCK_VEHICLE);
      prisma.favorite.findUnique.mockResolvedValue(MOCK_FAVORITE);

      await expect(service.addFavorite(1, 10)).rejects.toThrow(ConflictException);
    });

    it('does not call favorite.create when vehicle is not found', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(null);

      await expect(service.addFavorite(1, 999)).rejects.toThrow(NotFoundException);
      expect(prisma.favorite.create).not.toHaveBeenCalled();
    });
  });

  // ── removeFavorite ────────────────────────────────────────────────────────

  describe('removeFavorite', () => {
    it('calls deleteMany with the correct userId and vehicleId', async () => {
      prisma.favorite.deleteMany.mockResolvedValue({ count: 1 });

      await service.removeFavorite(1, 10);

      expect(prisma.favorite.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1, vehicleId: 10 },
      });
    });

    it('resolves without error even if the favorite did not exist', async () => {
      prisma.favorite.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.removeFavorite(1, 999)).resolves.toBeUndefined();
    });
  });
});
