import { expect, test } from '@playwright/test'

const password = 'correct horse battery staple'
const setupToken = 'playwright-test-setup-token-with-at-least-32-characters'
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')

test('administrator can publish a gallery and a visitor can browse and download', async ({ page, request }) => {
    const setup = await request.post('/api/auth/setup', {
        headers: { 'X-Setup-Token': setupToken },
        data: { password },
    })
    expect(setup.status()).toBe(201)

    await page.goto('/login')
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/admin$/)

    await page.getByLabel('New gallery').fill('Browser journey')
    await page.getByRole('button', { name: 'Create draft' }).click()
    await expect(page.getByRole('heading', { name: 'Browser journey' })).toBeVisible()

    await page.locator('#photo-files').setInputFiles({
        name: 'IMG_001.png',
        mimeType: 'image/png',
        buffer: image,
    })
    await expect(page.locator('.admin-photo-card img')).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: 'Set cover' }).click()
    await expect(page.getByRole('button', { name: 'Cover' })).toBeVisible()
    await page.getByRole('button', { name: 'Publish gallery' }).click()

    const sharePath = await page.locator('.share-banner code').textContent()
    expect(sharePath).toMatch(/^\/g\/browser-journey\/.+/)

    await page.goto(sharePath ?? '')
    await expect(page.getByRole('heading', { name: 'Browser journey' })).toBeVisible()
    await expect(page.locator('.visitor-photo').first()).toBeVisible()

    await page.locator('.visitor-photo').first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('img')).toBeVisible()

    const downloadPromise = page.waitForEvent('download')
    await dialog.getByRole('link', { name: 'Download original' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('IMG_001.png')
})
