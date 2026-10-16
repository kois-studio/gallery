import { expect, test } from '@playwright/test'

const password = 'correct horse battery staple'
const setupToken = 'playwright-test-setup-token-with-at-least-32-characters'
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')

test('administrator can publish a gallery and a visitor can browse and download', async ({ page }) => {
    const policyViolations: string[] = []
    page.on('console', (message) => {
        if (message.type() === 'error' && /Content Security Policy/i.test(message.text())) policyViolations.push(message.text())
    })
    page.on('dialog', (dialog) => void dialog.accept())

    await page.goto('/setup')
    await page.getByLabel('Setup token').fill(setupToken)
    await page.getByLabel('Administrator password').fill(password)
    await page.getByLabel('Repeat password').fill(password)
    await page.getByRole('button', { name: 'Create administrator' }).click()
    await expect(page).toHaveURL(/\/admin$/)

    await page.getByLabel('New gallery').fill('Browser journey')
    await page.getByRole('button', { name: 'Create draft' }).click()
    await expect(page.getByRole('heading', { name: 'Browser journey' })).toBeVisible()

    await page.locator('#photo-files').setInputFiles([
        { name: 'IMG_001.png', mimeType: 'image/png', buffer: image },
        { name: 'IMG_002.png', mimeType: 'image/png', buffer: image },
        { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') },
    ])
    await expect(page.locator('.admin-photo-card img')).toHaveCount(2, { timeout: 15_000 })
    await expect(page.locator('.upload-problem')).toContainText('notes.txt')

    await page.getByRole('button', { name: 'Set cover' }).first().click()
    await expect(page.locator('.cover-badge')).toBeVisible()
    await page.getByRole('button', { name: 'Publish gallery' }).click()

    const shareUrl = (await page.locator('.share-panel code').textContent())?.trim() ?? ''
    expect(shareUrl).toMatch(/^http:\/\/127\.0\.0\.1:3400\/g\/browser-journey\/.+/)

    await page.getByText('Gallery details').click()
    await page.getByLabel('Title').fill('Browser journey (final)')
    await page.getByRole('button', { name: 'Save details' }).click()
    await expect(page.getByRole('heading', { name: 'Browser journey (final)' })).toBeVisible()
    await expect(page.locator('.share-panel code')).toHaveText(shareUrl)

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(shareUrl)
    await expect(page.getByRole('heading', { name: 'Browser journey (final)' })).toBeVisible()
    await expect(page.locator('.visitor-photo')).toHaveCount(2)
    await expect
        .poll(() => page.locator('.visitor-page').evaluate((element) => getComputedStyle(element).backgroundColor))
        .toBe('rgb(17, 19, 17)')

    // The share URL is the bookmark: reloading it must keep working.
    await page.reload()
    await expect(page.locator('.visitor-photo')).toHaveCount(2)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('.visitor-photo').first().focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('.lightbox-counter')).toHaveText('1 / 2')
    await page.keyboard.press('ArrowRight')
    await expect(dialog.locator('.lightbox-counter')).toHaveText('2 / 2')
    await expect(dialog.locator('.lightbox-image')).toBeVisible()

    const downloadPromise = page.waitForEvent('download')
    await dialog.getByRole('link', { name: 'Download' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('IMG_002.png')

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(page.locator('.visitor-photo').nth(1)).toBeFocused()

    await page.goto('/g/browser-journey/not-the-real-token')
    await expect(page.getByRole('heading', { name: 'This link isn’t available.' })).toBeVisible()

    await page.goto('/admin')
    await page.getByRole('button', { name: 'Delete IMG_002.png' }).click()
    await expect(page.locator('.admin-photo-card')).toHaveCount(1)

    expect(policyViolations).toEqual([])
})
