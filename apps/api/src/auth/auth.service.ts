import { ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import type { GalleryConfiguration } from '../configuration.js'
import { DatabaseService } from '../database/database.service.js'
import type { AuthResult, AuthSession } from './auth.types.js'

const sessionLifetimeMs = 12 * 60 * 60 * 1000
const maximumLoginFailures = 5
const loginFailureWindowMs = 15 * 60 * 1000
const passwordSaltBytes = 16
const passwordKeyBytes = 64
const passwordScryptOptions = {
    N: 32_768,
    r: 8,
    p: 3,
    maxmem: 64 * 1024 * 1024,
}

interface LoginFailureState {
    count: number
    resetAt: number
}

interface SessionRow {
    id: string
    administrator_id: string
    csrf_token_hash: string | null
    expires_at: string
}

@Injectable()
export class AuthService {
    private readonly loginFailures = new Map<string, LoginFailureState>()

    constructor(
        private readonly database: DatabaseService,
        private readonly config: ConfigService<GalleryConfiguration, true>,
    ) {}

    async setup(setupToken: string | undefined, password: string): Promise<AuthResult> {
        const expectedToken = this.config.get('SETUP_TOKEN', { infer: true })
        if (!expectedToken || !setupToken || !safeEqual(setupToken, expectedToken)) {
            throw new ForbiddenException('Setup is not armed')
        }

        const existingAdministrator = this.database.connection.prepare('SELECT id FROM administrators LIMIT 1').get()
        if (existingAdministrator) {
            throw new ConflictException('Administrator setup is already complete')
        }

        const passwordHash = await hashPassword(password)
        const administratorId = randomUUID()
        const now = new Date().toISOString()

        const createAdministrator = this.database.connection.transaction(() => {
            this.database.connection
                .prepare(
                    `INSERT INTO administrators (id, password_hash, created_at, updated_at)
           VALUES (?, ?, ?, ?)`,
                )
                .run(administratorId, passwordHash, now, now)

            return this.createSession(administratorId)
        })

        return createAdministrator()
    }

    async signIn(password: string, remoteAddress: string): Promise<AuthResult> {
        this.assertLoginAllowed(remoteAddress)

        const administrator = this.database.connection.prepare('SELECT id, password_hash FROM administrators LIMIT 1').get() as
            { id: string; password_hash: string } | undefined

        if (!administrator || !(await verifyPassword(administrator.password_hash, password))) {
            this.recordLoginFailure(remoteAddress)
            throw new UnauthorizedException('Invalid credentials')
        }

        this.loginFailures.delete(remoteAddress)
        return this.createSession(administrator.id)
    }

    async validateSession(token: string | undefined): Promise<AuthSession | undefined> {
        if (!token) {
            return undefined
        }

        const tokenHash = hashToken(token)
        const row = this.database.connection
            .prepare(
                `SELECT id, administrator_id, csrf_token_hash, expires_at
         FROM sessions
         WHERE token_hash = ? AND revoked_at IS NULL`,
            )
            .get(tokenHash) as SessionRow | undefined

        if (!row) {
            return undefined
        }

        if (Date.parse(row.expires_at) <= Date.now() || !row.csrf_token_hash) {
            this.revokeSession(row.id)
            return undefined
        }

        return {
            id: row.id,
            administratorId: row.administrator_id,
            csrfTokenHash: row.csrf_token_hash,
        }
    }

    validateCsrf(session: AuthSession, headerToken: string | undefined, cookieToken: string | undefined): boolean {
        if (!headerToken || !cookieToken || !safeEqual(headerToken, cookieToken)) {
            return false
        }

        return safeEqual(hashToken(headerToken), session.csrfTokenHash)
    }

    revokeSession(sessionId: string): void {
        this.database.connection
            .prepare('UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL')
            .run(new Date().toISOString(), sessionId)
    }

    revokeAllSessions(): void {
        this.database.connection.prepare('UPDATE sessions SET revoked_at = ? WHERE revoked_at IS NULL').run(new Date().toISOString())
    }

    private createSession(administratorId: string): AuthResult {
        const sessionToken = randomBytes(32).toString('base64url')
        const csrfToken = randomBytes(32).toString('base64url')
        const createdAt = new Date()
        const expiresAt = new Date(createdAt.getTime() + sessionLifetimeMs).toISOString()

        this.database.connection
            .prepare(
                `INSERT INTO sessions
          (id, administrator_id, token_hash, csrf_token_hash, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
            )
            .run(randomUUID(), administratorId, hashToken(sessionToken), hashToken(csrfToken), createdAt.toISOString(), expiresAt)

        return { sessionToken, csrfToken, expiresAt }
    }

    private assertLoginAllowed(remoteAddress: string): void {
        const failure = this.loginFailures.get(remoteAddress)
        if (!failure) {
            return
        }

        if (failure.resetAt <= Date.now()) {
            this.loginFailures.delete(remoteAddress)
            return
        }

        if (failure.count >= maximumLoginFailures) {
            throw new HttpException('Too many failed sign-in attempts', HttpStatus.TOO_MANY_REQUESTS)
        }
    }

    private recordLoginFailure(remoteAddress: string): void {
        const now = Date.now()
        const current = this.loginFailures.get(remoteAddress)
        if (!current || current.resetAt <= now) {
            this.loginFailures.set(remoteAddress, {
                count: 1,
                resetAt: now + loginFailureWindowMs,
            })
            return
        }

        current.count += 1
    }
}

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(passwordSaltBytes)
    const derivedKey = await deriveKey(password, salt, passwordKeyBytes, passwordScryptOptions)

    return [
        'scrypt',
        'v=1',
        `N=${passwordScryptOptions.N},r=${passwordScryptOptions.r},p=${passwordScryptOptions.p}`,
        salt.toString('base64url'),
        derivedKey.toString('base64url'),
    ].join('$')
}

export async function verifyPassword(encodedHash: string, password: string): Promise<boolean> {
    const parts = encodedHash.split('$')
    if (parts.length !== 5 || parts[0] !== 'scrypt' || parts[1] !== 'v=1') {
        return false
    }

    const parameters = /^N=(\d+),r=(\d+),p=(\d+)$/.exec(parts[2])
    if (!parameters) {
        return false
    }

    const [, n, r, p] = parameters
    if (Number(n) !== passwordScryptOptions.N || Number(r) !== passwordScryptOptions.r || Number(p) !== passwordScryptOptions.p) {
        return false
    }
    const salt = Buffer.from(parts[3], 'base64url')
    const expectedKey = Buffer.from(parts[4], 'base64url')
    if (salt.length < passwordSaltBytes || expectedKey.length !== passwordKeyBytes) {
        return false
    }

    const derivedKey = await deriveKey(password, salt, expectedKey.length, {
        N: Number(n),
        r: Number(r),
        p: Number(p),
        maxmem: passwordScryptOptions.maxmem,
    })

    return timingSafeEqual(derivedKey, expectedKey)
}

export function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
}

function safeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left)
    const rightBuffer = Buffer.from(right)
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function deriveKey(
    password: string,
    salt: Buffer,
    keyLength: number,
    options: { N: number; r: number; p: number; maxmem: number },
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
            if (error) {
                reject(error)
                return
            }

            resolve(derivedKey)
        })
    })
}
