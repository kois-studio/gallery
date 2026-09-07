import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { z } from 'zod';
import type { GalleryConfiguration } from '../configuration.js';
import { AdminAuthGuard, type AuthenticatedRequest } from './admin-auth.guard.js';
import { AuthService } from './auth.service.js';
import { CsrfGuard } from './csrf.guard.js';
import { cookieValue, csrfCookieName, readCookies, sessionCookieName } from './cookies.js';

const passwordSchema = z.string().min(12).max(256);

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<GalleryConfiguration, true>,
  ) {}

  @Post('setup')
  @HttpCode(201)
  async setup(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() body: unknown,
  ) {
    const password = parsePassword(body);
    const result = await this.auth.setup(request.header('x-setup-token'), password);
    this.setAuthCookies(response, result.sessionToken, result.csrfToken, result.expiresAt);
    return { administrator: { configured: true }, csrfToken: result.csrfToken, expiresAt: result.expiresAt };
  }

  @Post('sign-in')
  @HttpCode(200)
  async signIn(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() body: unknown,
  ) {
    const password = parsePassword(body);
    const result = await this.auth.signIn(password, request.ip ?? 'unknown');
    this.setAuthCookies(response, result.sessionToken, result.csrfToken, result.expiresAt);
    return { administrator: { authenticated: true }, csrfToken: result.csrfToken, expiresAt: result.expiresAt };
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return { administratorId: request.authSession.administratorId, authenticated: true };
  }

  @Post('sign-out')
  @HttpCode(204)
  @UseGuards(AdminAuthGuard, CsrfGuard)
  signOut(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): void {
    this.auth.revokeSession(request.authSession.id);
    this.clearAuthCookies(response);
  }

  private setAuthCookies(
    response: Response,
    sessionToken: string,
    csrfToken: string,
    expiresAt: string,
  ): void {
    const secure = this.config.get('NODE_ENV', { infer: true }) === 'production';
    const maxAge = Math.max(0, Date.parse(expiresAt) - Date.now());
    response.setHeader('Set-Cookie', [
      cookieValue(`${sessionCookieName}=${encodeURIComponent(sessionToken)}`, {
        httpOnly: true,
        secure,
        maxAge,
      }),
      cookieValue(`${csrfCookieName}=${encodeURIComponent(csrfToken)}`, { secure, maxAge }),
    ]);
  }

  private clearAuthCookies(response: Response): void {
    const secure = this.config.get('NODE_ENV', { infer: true }) === 'production';
    response.setHeader('Set-Cookie', [
      cookieValue(`${sessionCookieName}=`, { httpOnly: true, secure, maxAge: 0 }),
      cookieValue(`${csrfCookieName}=`, { secure, maxAge: 0 }),
    ]);
  }
}

function parsePassword(body: unknown): string {
  if (!body || typeof body !== 'object' || !('password' in body)) {
    throw new BadRequestException('Password is required');
  }

  const result = passwordSchema.safeParse(body.password);
  if (!result.success) {
    throw new BadRequestException('Password must be between 12 and 256 characters');
  }

  return result.data;
}

export function sessionCookieFromRequest(request: Request): string | undefined {
  return readCookies(request.headers.cookie)[sessionCookieName];
}
