import { Test, type TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

// ── helpers ──────────────────────────────────────────────────────────────────

const MOCK_JWT_PAYLOAD: JwtPayload = { sub: 1, email: 'user@example.com' };

const MOCK_USER_PROFILE = {
  id: 1,
  email: 'user@example.com',
  createdAt: new Date('2024-01-01'),
};

const MOCK_FAVORITE = {
  id: 100,
  userId: 1,
  vehicleId: 10,
  createdAt: new Date(),
  vehicle: { id: 10, make: 'Toyota', model: 'Camry', source: { slug: 'copart', name: 'Copart' } },
};

// ── suite ─────────────────────────────────────────────────────────────────────

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
            getFavorites: jest.fn(),
            addFavorite: jest.fn(),
            removeFavorite: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  // ── getMe ─────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('calls usersService.findById with the userId from the JWT payload', async () => {
      usersService.findById.mockResolvedValue(MOCK_USER_PROFILE);

      const result = await controller.getMe(MOCK_JWT_PAYLOAD);

      expect(usersService.findById).toHaveBeenCalledWith(MOCK_JWT_PAYLOAD.sub);
      expect(result).toEqual(MOCK_USER_PROFILE);
    });
  });

  // ── getFavorites ──────────────────────────────────────────────────────────

  describe('getFavorites', () => {
    it('calls usersService.getFavorites with the userId and returns the result', async () => {
      usersService.getFavorites.mockResolvedValue([MOCK_FAVORITE] as never);

      const result = await controller.getFavorites(MOCK_JWT_PAYLOAD);

      expect(usersService.getFavorites).toHaveBeenCalledWith(MOCK_JWT_PAYLOAD.sub);
      expect(result).toEqual([MOCK_FAVORITE]);
    });

    it('returns an empty array when the user has no favorites', async () => {
      usersService.getFavorites.mockResolvedValue([]);

      const result = await controller.getFavorites(MOCK_JWT_PAYLOAD);

      expect(result).toEqual([]);
    });
  });

  // ── addFavorite ───────────────────────────────────────────────────────────

  describe('addFavorite', () => {
    it('calls usersService.addFavorite with userId from the JWT and the parsed vehicleId', async () => {
      usersService.addFavorite.mockResolvedValue(MOCK_FAVORITE);

      const result = await controller.addFavorite(MOCK_JWT_PAYLOAD, 10);

      expect(usersService.addFavorite).toHaveBeenCalledWith(MOCK_JWT_PAYLOAD.sub, 10);
      expect(result).toEqual(MOCK_FAVORITE);
    });
  });

  // ── removeFavorite ────────────────────────────────────────────────────────

  describe('removeFavorite', () => {
    it('calls usersService.removeFavorite with userId from the JWT and the parsed vehicleId', async () => {
      usersService.removeFavorite.mockResolvedValue();

      await controller.removeFavorite(MOCK_JWT_PAYLOAD, 10);

      expect(usersService.removeFavorite).toHaveBeenCalledWith(MOCK_JWT_PAYLOAD.sub, 10);
    });

    it('passes the correct vehicleId, not the userId', async () => {
      usersService.removeFavorite.mockResolvedValue();

      await controller.removeFavorite(MOCK_JWT_PAYLOAD, 42);

      const [calledUserId, calledVehicleId] = usersService.removeFavorite.mock.calls[0];
      expect(calledUserId).toBe(MOCK_JWT_PAYLOAD.sub);
      expect(calledVehicleId).toBe(42);
    });
  });
});
