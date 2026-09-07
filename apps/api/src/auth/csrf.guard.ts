import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import type { Request } from 'express'
import { AuthService } from './auth.service.js'
import { csrfCookieName, readCookies } from './cookies.js'
import type { AuthSession } from './auth.types.js'

type CsrfRequest = Request & { authSession: AuthSession }

@Injectable()
export class CsrfGuard implements CanActivate {
    constructor(private readonly auth: AuthService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<CsrfRequest>()
        const header = request.header('x-csrf-token')
        const cookie = readCookies(request.headers.cookie)[csrfCookieName]

        if (!this.auth.validateCsrf(request.authSession, header, cookie)) {
            throw new ForbiddenException('CSRF validation failed')
        }

        return true
    }
}
