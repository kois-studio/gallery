export interface AuthSession {
    id: string
    administratorId: string
    csrfTokenHash: string
}

export interface AuthResult {
    sessionToken: string
    csrfToken: string
    expiresAt: string
}
