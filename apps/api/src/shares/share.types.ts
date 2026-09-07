export interface VisitorSession {
    id: string
    galleryId: string
    slug: string
    expiresAt: string
}

export interface VisitorSessionGrant {
    session: VisitorSession
    cookieValue: string
}
