import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeRes(): jest.Mocked<Pick<Response, 'cookie' | 'clearCookie'>> {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };
}

function makeReq(cookies: Record<string, string> = {}): Partial<Request> {
  return { cookies } as Partial<Request>;
}

const REFRESH_COOKIE = 'refresh_token';
const MOCK_ACCESS = 'access.token.here';
const MOCK_REFRESH = 'refresh-uuid-token';

// ── suite ─────────────────────────────────────────────────────────────────────

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() }, // NODE_ENV not 'production' → secure: false
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  // ── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('sets the refresh cookie and returns accessToken', async () => {
      const dto = { email: 'user@example.com', password: 'password123' };
      const res = makeRes() as unknown as Response;
      authService.register.mockResolvedValue({
        accessToken: MOCK_ACCESS,
        refreshToken: MOCK_REFRESH,
      });

      const result = await controller.register(dto, res);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(res.cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE,
        MOCK_REFRESH,
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({ accessToken: MOCK_ACCESS });
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('calls authService.login, sets the refresh cookie, and returns accessToken', async () => {
      const dto = { email: 'user@example.com', password: 'password123' };
      const res = makeRes() as unknown as Response;

      authService.login.mockResolvedValue({
        accessToken: MOCK_ACCESS,
        refreshToken: MOCK_REFRESH,
      });

      const result = await controller.login(dto, res);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(res.cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE,
        MOCK_REFRESH,
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({ accessToken: MOCK_ACCESS });
    });
  });

  // ── refresh ───────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('reads the cookie, sets a new one, and returns new accessToken', async () => {
      const req = makeReq({ [REFRESH_COOKIE]: MOCK_REFRESH }) as Request;
      const res = makeRes() as unknown as Response;

      authService.refresh.mockResolvedValue({
        accessToken: MOCK_ACCESS,
        refreshToken: 'new-refresh-token',
      });

      const result = await controller.refresh(req, res);

      expect(authService.refresh).toHaveBeenCalledWith(MOCK_REFRESH);
      expect(res.cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE,
        'new-refresh-token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({ accessToken: MOCK_ACCESS });
    });

    it('passes an empty string to authService.refresh when cookie is missing', async () => {
      const req = makeReq({}) as Request;
      const res = makeRes() as unknown as Response;

      authService.refresh.mockResolvedValue({
        accessToken: MOCK_ACCESS,
        refreshToken: 'new-refresh-token',
      });

      await controller.refresh(req, res);

      expect(authService.refresh).toHaveBeenCalledWith('');
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('reads the cookie, calls authService.logout, and clears the cookie', async () => {
      const req = makeReq({ [REFRESH_COOKIE]: MOCK_REFRESH }) as Request;
      const res = makeRes() as unknown as Response;

      authService.logout.mockResolvedValue();

      await controller.logout(req, res);

      expect(authService.logout).toHaveBeenCalledWith(MOCK_REFRESH);
      expect(res.clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE, { path: '/' });
    });

    it('clears the cookie even when no refresh token cookie is present', async () => {
      const req = makeReq({}) as Request;
      const res = makeRes() as unknown as Response;

      authService.logout.mockResolvedValue();

      await controller.logout(req, res);

      expect(authService.logout).toHaveBeenCalledWith('');
      expect(res.clearCookie).toHaveBeenCalled();
    });
  });
});
