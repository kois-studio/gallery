import sharp from 'sharp'

const baseUrl = process.env.LOCAL_DEMO_URL
const password = process.env.LOCAL_DEMO_PASSWORD
const setupToken = process.env.SETUP_TOKEN

if (!baseUrl || !password || !setupToken) {
    throw new Error('LOCAL_DEMO_URL, LOCAL_DEMO_PASSWORD, and SETUP_TOKEN are required')
}

const setup = await request('/api/auth/setup', {
    method: 'POST',
    headers: { 'X-Setup-Token': setupToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
})
if (setup.response.status !== 201) {
    throw new Error(`Demo setup failed with HTTP ${setup.response.status}: ${JSON.stringify(setup.body)}`)
}

let adminCookie = setup.cookie
const csrfToken = setup.body.csrfToken
const gallery = await request('/api/admin/galleries', {
    method: 'POST',
    headers: authHeaders(adminCookie, csrfToken),
    body: JSON.stringify({
        title: 'Demo wedding collection',
        description: 'Synthetic local demo data for reviewing the complete delivery flow.',
        eventDate: '2026-09-13',
    }),
})
assertStatus(gallery, 201, 'creating the demo gallery')

const form = new FormData()
const images = [
    ['demo-landscape-01.jpg', 1200, 800, { r: 38, g: 73, b: 91 }],
    ['demo-portrait-02.jpg', 720, 960, { r: 157, g: 103, b: 73 }],
    ['demo-landscape-03.jpg', 1200, 800, { r: 82, g: 112, b: 88 }],
    ['demo-square-04.jpg', 900, 900, { r: 126, g: 84, b: 119 }],
]
for (const [filename, width, height, background] of images) {
    const buffer = await sharp({ create: { width, height, channels: 3, background } })
        .jpeg({ quality: 84 })
        .toBuffer()
    form.append('files', new Blob([buffer], { type: 'image/jpeg' }), filename)
}

const upload = await request(`/api/admin/galleries/${gallery.body.id}/photos`, {
    method: 'POST',
    headers: {
        Cookie: adminCookie,
        'X-CSRF-Token': csrfToken,
    },
    body: form,
})
assertStatus(upload, 201, 'uploading demo images')
if (upload.body.files?.filter(file => file.status === 'queued').length !== images.length) {
    throw new Error(`Demo upload did not queue all images: ${JSON.stringify(upload.body)}`)
}

let photos
for (let attempt = 0; attempt < 60; attempt += 1) {
    const status = await request(`/api/admin/galleries/${gallery.body.id}/photos`, {
        headers: { Cookie: adminCookie },
    })
    assertStatus(status, 200, 'checking demo processing')
    photos = status.body.files
    if (photos.filter(photo => photo.status === 'ready').length === images.length) break
    await new Promise(resolve => setTimeout(resolve, 250))
}
if (photos?.filter(photo => photo.status === 'ready').length !== images.length) {
    throw new Error(`Demo images did not become ready: ${JSON.stringify(photos)}`)
}

const cover = await request(`/api/admin/galleries/${gallery.body.id}/cover`, {
    method: 'PATCH',
    headers: authHeaders(adminCookie, csrfToken),
    body: JSON.stringify({ photoId: photos[0].photoId }),
})
assertStatus(cover, 200, 'selecting the demo cover')

const published = await request(`/api/admin/galleries/${gallery.body.id}/publish`, {
    method: 'POST',
    headers: authHeaders(adminCookie, csrfToken),
})
assertStatus(published, 201, 'publishing the demo gallery')

const draft = await request('/api/admin/galleries', {
    method: 'POST',
    headers: authHeaders(adminCookie, csrfToken),
    body: JSON.stringify({ title: 'Draft gallery example' }),
})
assertStatus(draft, 201, 'creating the demo draft')

const [, , slug, token] = published.body.sharePath.split('/')
const visitorSession = await request(`/api/share/${slug}/${token}/session`, { method: 'POST' })
assertStatus(visitorSession, 200, 'creating the demo visitor session')
const visitor = await request(`/api/shared/galleries/${slug}`, { headers: { Cookie: visitorSession.cookie } })
assertStatus(visitor, 200, 'loading the demo visitor gallery')
if (visitor.body.photos?.length !== images.length) {
    throw new Error(`Demo visitor gallery returned ${visitor.body.photos?.length ?? 0} photos`)
}

console.log(JSON.stringify({ sharePath: published.body.sharePath, galleryId: gallery.body.id, photoCount: images.length }))

async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, options)
    const cookie = getCookie(response)
    let body = {}
    try {
        body = await response.json()
    } catch {
        // Empty responses are valid for some API operations.
    }
    return { response, body, cookie }
}

function authHeaders(cookie, csrf) {
    return {
        Cookie: cookie,
        'X-CSRF-Token': csrf,
        'Content-Type': 'application/json',
    }
}

function getCookie(response) {
    const cookies = response.headers.getSetCookie?.() ?? []
    return cookies.map(cookie => cookie.split(';', 1)[0]).join('; ')
}

function assertStatus(result, expected, action) {
    if (result.response.status !== expected) {
        throw new Error(`${action} failed with HTTP ${result.response.status}: ${JSON.stringify(result.body)}`)
    }
}
