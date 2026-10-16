import { describe, expect, it } from 'vitest'
import { validateConfiguration } from './configuration.js'

describe('validateConfiguration', () => {
    it('parses the explicit local HTTP cookie override', () => {
        expect(validateConfiguration({ NODE_ENV: 'production', COOKIE_SECURE: 'false' }).COOKIE_SECURE).toBe(false)
        expect(validateConfiguration({ NODE_ENV: 'production' }).COOKIE_SECURE).toBeUndefined()
    })

    it('treats an empty TRUST_PROXY as disabled', () => {
        expect(validateConfiguration({ TRUST_PROXY: '' }).TRUST_PROXY).toBeUndefined()
        expect(validateConfiguration({ TRUST_PROXY: 'loopback, uniquelocal' }).TRUST_PROXY).toBe('loopback, uniquelocal')
    })
})
