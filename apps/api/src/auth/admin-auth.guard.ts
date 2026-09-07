import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { readCookies, sessionCookieName } from './cookies.js';
import type { AuthSession } from './auth.types.js';

export type AuthenticatedRequest = Request & { authSession: AuthSession };

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies = readCookies(request.headers.cookie);
    const session = await this.auth.validateSession(cookies[sessionCookieName]);

    if (!session) {
      throw new UnauthorizedException('Administrator authentication required');
    }

    request.authSession = session;
    return true;
  }
}
