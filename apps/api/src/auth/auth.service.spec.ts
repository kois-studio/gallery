import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './auth.service.js'

describe('password hashing', () => {
    it('creates a salted scrypt hash and verifies only the original password', async () => {
        const firstHash = await hashPassword('correct horse battery staple')
        const secondHash = await hashPassword('correct horse battery staple')

        expect(firstHash).toMatch(/^scrypt\$v=1\$N=32768,r=8,p=3\$/)
        expect(secondHash).not.toBe(firstHash)
        await expect(verifyPassword(firstHash, 'correct horse battery staple')).resolves.toBe(true)
        await expect(verifyPassword(firstHash, 'wrong password')).resolves.toBe(false)
    })
})
