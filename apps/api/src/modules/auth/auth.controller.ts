import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import {
  loginSchema,
  registerSchema,
  type AuthResult,
  type LoginInput,
  type RegisterInput,
} from '@allisteam/shared';
import { RateLimit } from '../../common/guards/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { EnvService } from '../../config/env.service';
import { AuthService, type IssuedSession } from './auth.service';

const REFRESH_COOKIE = 'at_refresh';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly env: EnvService,
  ) {}

  @Post('register')
  @UseGuards(RateLimitGuard)
  @RateLimit({ name: 'auth:register', limit: 5, windowSeconds: 60 })
  async register(
    @Body(new ZodValidationPipe(registerSchema)) input: RegisterInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResult> {
    const session = await this.auth.register(input);
    return this.finish(session, response);
  }

  @Post('login')
  @UseGuards(RateLimitGuard)
  @RateLimit({ name: 'auth:login', limit: 5, windowSeconds: 60 })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) input: LoginInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResult> {
    const session = await this.auth.login(input);
    return this.finish(session, response);
  }

  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResult> {
    const session = await this.auth.refresh(readRefreshCookie(request));
    return this.finish(session, response);
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ ok: true }> {
    await this.auth.logout(readRefreshCookie(request));
    response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
    return { ok: true };
  }

  private finish(session: IssuedSession, response: Response): AuthResult {
    response.cookie(REFRESH_COOKIE, session.refreshToken, {
      ...this.cookieOptions(),
      expires: session.refreshExpiresAt,
    });

    return {
      accessToken: session.accessToken,
      expiresIn: session.expiresIn,
      user: session.user,
    };
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.env.values.NODE_ENV === 'production',
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
    };
  }
}

function readRefreshCookie(request: Request): string | undefined {
  const cookies = request.cookies as Record<string, string | undefined> | undefined;
  return cookies?.[REFRESH_COOKIE];
}
