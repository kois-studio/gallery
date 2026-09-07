import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import { readCookies, visitorCookieName } from '../auth/cookies.js'
import { ShareService } from './share.service.js'
import type { VisitorSession } from './share.types.js'

export type VisitorRequest = Request & { visitorSession?: VisitorSession }

@Injectable()
export class VisitorAuthGuard implements CanActivate {
    constructor(private readonly shares: ShareService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<VisitorRequest>()
        const cookie = readCookies(request.headers.cookie)[visitorCookieName]
        const session = this.shares.validateVisitorSession(cookie)
        if (!session) {
            throw new UnauthorizedException('Gallery visitor access required')
        }
        request.visitorSession = session
        return true
    }
}
