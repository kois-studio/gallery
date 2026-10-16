import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'

async function bootstrap() {
    const app = await NestFactory.create(AppModule)
    const httpServer = app.getHttpAdapter().getInstance()
    httpServer.disable('x-powered-by')
    app.use((_request: unknown, response: { setHeader(name: string, value: string): void }, next: () => void) => {
        response.setHeader('X-Content-Type-Options', 'nosniff')
        response.setHeader('Referrer-Policy', 'no-referrer')
        response.setHeader('X-Frame-Options', 'DENY')
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
