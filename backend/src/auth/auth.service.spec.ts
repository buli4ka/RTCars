import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

// bcryptjs exports are non-configurable in ESM — mock the whole module
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

// ── helpers ──────────────────────────────────────────────────────────────────

function makePrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

const MOCK_JWT_SECRET = 'test-secret';
const MOCK_ACCESS_TOKEN = 'signed.access.token';
const MOCK_USER = {
  id: 1,
  email: 'user@example.com',
  passwordHash: 'hashed_pw',
};

// ── suite ─────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue(MOCK_ACCESS_TOKEN) },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(MOCK_JWT_SECRET),
            // mirror real ConfigService: return defaultValue when key is not set
            get: jest
              .fn()
              .mockImplementation((_key: string, defaultValue?: unknown) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates a user and returns accessToken + refreshToken on success', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(MOCK_USER);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register({
        email: 'user@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken', MOCK_ACCESS_TOKEN);
      expect(result).toHaveProperty('refreshToken');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'user@example.com' }),
        }),
      );
    });

    it('throws ConflictException when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(MOCK_USER);

      await expect(
        service.register({ email: 'user@example.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('hashes the password before persisting', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(MOCK_USER);
      prisma.refreshToken.create.mockResolvedValue({});

      await service.register({ email: 'user@example.com', password: 'password123' });

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns accessToken and refreshToken on valid credentials', async () => {
      // bcrypt.hash and compare are mocked — compare returns true by default
      prisma.user.findUnique.mockResolvedValue(MOCK_USER);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({
        email: 'user@example.com',
        password: 'correct_pw',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('throws UnauthorizedException for unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login({ email: 'nobody@example.com', password: 'pw' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(MOCK_USER);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.login({ email: 'user@example.com', password: 'wrong_pw' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── refresh ───────────────────────────────────────────────────────────────

  describe('refresh', () => {
    const STORED_TOKEN = {
      token: 'valid-refresh-token',
      expiresAt: new Date(Date.now() + 60_000), // 1 minute in the future
      user: MOCK_USER,
    };

    it('rotates token: deletes old, creates new, returns new pair', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(STORED_TOKEN);
      prisma.refreshToken.delete.mockResolvedValue(STORED_TOKEN);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('valid-refresh-token');

      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { token: 'valid-refresh-token' },
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws UnauthorizedException for unknown token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('unknown-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for expired token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...STORED_TOKEN,
        expiresAt: new Date(Date.now() - 1000), // 1 second in the past
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('calls prisma.refreshToken.deleteMany with the correct token', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout('some-refresh-token');

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'some-refresh-token' },
      });
    });

    it('resolves without error even if token does not exist', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.logout('nonexistent-token')).resolves.toBeUndefined();
    });
  });

  // ── sign helper sanity check ──────────────────────────────────────────────

  describe('signAccess (via register)', () => {
    it('calls jwt.sign with the correct payload structure', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(MOCK_USER);
      prisma.refreshToken.create.mockResolvedValue({});

      await service.register({ email: 'user@example.com', password: 'password123' });

      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: MOCK_USER.id, email: MOCK_USER.email },
        expect.objectContaining({ secret: MOCK_JWT_SECRET }),
      );
    });
  });
});
