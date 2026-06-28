import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_BCRYPT_ROUNDS,
  DEFAULT_REFRESH_TOKEN_TTL_DAYS,
  MS_PER_DAY,
} from './auth.constants';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string; refreshToken: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) throw new ConflictException('Email already in use');

    const rounds =
      parseInt(this.config.get<string>('BCRYPT_ROUNDS') ?? '', 10) || DEFAULT_BCRYPT_ROUNDS;
    const passwordHash = await bcrypt.hash(dto.password, rounds);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash },
    });

    const accessToken = this.signAccess(user.id, user.email);
    const refreshToken = await this.createRefreshToken(user.id);

    return { accessToken, refreshToken };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const accessToken = this.signAccess(user.id, user.email);
    const refreshToken = await this.createRefreshToken(user.id);

    return { accessToken, refreshToken };
  }

  async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!stored) throw new UnauthorizedException('Invalid or expired refresh token');

    if (stored.expiresAt < new Date()) {
      // clean up the expired token so it doesn't accumulate
      await this.prisma.refreshToken.delete({ where: { token } });

      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // rotate: delete old, issue new
    await this.prisma.refreshToken.delete({ where: { token } });

    const accessToken = this.signAccess(stored.user.id, stored.user.email);
    const refreshToken = await this.createRefreshToken(stored.user.id);

    return { accessToken, refreshToken };
  }

  async logout(token: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { token } });
  }

  // ── helpers ──────────────────────────────────────────────────

  private signAccess(userId: number, email: string): string {
    const payload: JwtPayload = { sub: userId, email };

    return this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.config.getOrThrow<string>('JWT_EXPIRES_IN') as unknown as number,
    });
  }

  private async createRefreshToken(userId: number): Promise<string> {
    const token = crypto.randomUUID();
    const ttlDays =
      parseInt(this.config.get<string>('REFRESH_TOKEN_TTL_DAYS') ?? '', 10) ||
      DEFAULT_REFRESH_TOKEN_TTL_DAYS;
    const expiresAt = new Date(Date.now() + ttlDays * MS_PER_DAY);

    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });

    return token;
  }
}
