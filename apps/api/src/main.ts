import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module.js'

const contentSecurityPolicy = [
    "default-src 'self'",
    "img-src 'self' data: blob:",
    // Angular injects component styles at runtime.
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
].join('; ')

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule)
    const httpServer = app.getHttpAdapter().getInstance()
    httpServer.disable('x-powered-by')
    if (process.env.TRUST_PROXY) {
        // Lets request.ip reflect the client behind the documented reverse proxy, so sign-in throttling is per client.
        app.set('trust proxy', process.env.TRUST_PROXY)
    }
    app.use((_request: unknown, response: { setHeader(name: string, value: string): void }, next: () => void) => {
        response.setHeader('X-Content-Type-Options', 'nosniff')
        response.setHeader('Referrer-Policy', 'no-referrer')
        response.setHeader('X-Frame-Options', 'DENY')
        response.setHeader('Content-Security-Policy', contentSecurityPolicy)
        response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        next()
    })
    app.enableCors({
        origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
        credentials: true,
    })
    await app.listen(process.env.PORT ?? 3000)
}
await bootstrap()
