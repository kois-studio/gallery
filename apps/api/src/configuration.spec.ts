import { describe, expect, it } from 'vitest'
import { validateConfiguration } from './configuration.js'

describe('validateConfiguration', () => {
    it('parses the explicit local HTTP cookie override', () => {
        expect(validateConfiguration({ NODE_ENV: 'production', COOKIE_SECURE: 'false' }).COOKIE_SECURE).toBe(false)
        expect(validateConfiguration({ NODE_ENV: 'production' }).COOKIE_SECURE).toBeUndefined()
    })
})
