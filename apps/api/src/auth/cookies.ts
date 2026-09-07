export const sessionCookieName = 'gallery_admin_session'
export const csrfCookieName = 'gallery_admin_csrf'
export const visitorCookieName = 'gallery_visitor_session'

export function readCookies(header: string | undefined): Record<string, string> {
    if (!header) {
        return {}
    }

    return Object.fromEntries(
        header.split(';').flatMap(part => {
            const separator = part.indexOf('=')
            if (separator < 1) {
                return []
            }

            const key = part.slice(0, separator).trim()
            const value = part.slice(separator + 1).trim()
            return [[key, decodeURIComponent(value)]]
        }),
    )
}

export function cookieValue(value: string, options: { httpOnly?: boolean; secure?: boolean; maxAge?: number } = {}): string {
    const attributes = ['Path=/', 'SameSite=Lax']
    if (options.httpOnly) {
        attributes.push('HttpOnly')
    }
    if (options.secure) {
        attributes.push('Secure')
    }
    if (options.maxAge !== undefined) {
        attributes.push(`Max-Age=${options.maxAge}`)
    }

    return `${value}; ${attributes.join('; ')}`
}
