import { ConfigService } from '@nestjs/config'
import type { GalleryConfiguration } from '../configuration.js'

export function shouldUseSecureCookies(config: ConfigService<GalleryConfiguration, true>): boolean {
    return config.get('COOKIE_SECURE', { infer: true }) ?? config.get('NODE_ENV', { infer: true }) === 'production'
}
