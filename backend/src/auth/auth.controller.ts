import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './decorators/public.decorator';
import { DEFAULT_REFRESH_TOKEN_TTL_DAYS, MS_PER_DAY } from './auth.constants';

const REFRESH_COOKIE = 'refresh_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private cookieOpts() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.config.get('NODE_ENV') === 'production',
      maxAge:
        this.config.get<number>('REFRESH_TOKEN_TTL_DAYS', DEFAULT_REFRESH_TOKEN_TTL_DAYS) *
        MS_PER_DAY,
      path: '/',
    };
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.register(dto);
    res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOpts());

    return { accessToken };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive tokens' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOpts());

    return { accessToken };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using httpOnly cookie' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token: string = (req.cookies as Record<string, string>)[REFRESH_COOKIE] ?? '';
    const { accessToken, refreshToken } = await this.authService.refresh(token);
    res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOpts());

    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token: string = (req.cookies as Record<string, string>)[REFRESH_COOKIE] ?? '';
    await this.authService.logout(token);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }
}
