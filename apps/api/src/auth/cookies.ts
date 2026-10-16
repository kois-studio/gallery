export const sessionCookieName = 'gallery_admin_session'
export const csrfCookieName = 'gallery_admin_csrf'
export const visitorCookieName = 'gallery_visitor'

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
            try {
                return [[key, decodeURIComponent(value)]]
            } catch {
                return []
            }
        }),
    )
}

/** Builds a Set-Cookie value. `maxAgeMs` is converted to the seconds required by the Max-Age attribute. */
export function cookieValue(
    value: string,
    options: { httpOnly?: boolean; secure?: boolean; maxAgeMs?: number; path?: string } = {},
): string {
    const attributes = [`Path=${options.path ?? '/'}`, 'SameSite=Lax']
    if (options.httpOnly) {
        attributes.push('HttpOnly')
    }
    if (options.secure) {
        attributes.push('Secure')
    }
    if (options.maxAgeMs !== undefined) {
        attributes.push(`Max-Age=${Math.max(0, Math.floor(options.maxAgeMs / 1000))}`)
    }

    return `${value}; ${attributes.join('; ')}`
}

/** Visitor cookies are scoped to one gallery's API path so access to several galleries can coexist in one browser. */
export function visitorCookiePath(slug: string): string {
    return `/api/shared/galleries/${slug}`
}
