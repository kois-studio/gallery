import { HttpClient, HttpEvent, HttpEventType, HttpHeaders } from '@angular/common/http'
import { Injectable, inject, signal } from '@angular/core'
import { Observable, map } from 'rxjs'

export interface AuthResponse {
    csrfToken: string
    expiresAt: string
}

export interface Gallery {
    id: string
    slug: string
    title: string
    description: string | null
    eventDate: string | null
    status: 'draft' | 'published'
    coverPhotoId: string | null
    createdAt: string
    updatedAt: string
    publishedAt: string | null
}

export interface GalleryPhoto {
    photoId: string
    originalName: string
    bytes: number
    status: 'pending' | 'processing' | 'ready' | 'failed' | 'cancelled'
    width?: number | null
    height?: number | null
    thumbnailUrl?: string
    displayUrl?: string
    originalUrl?: string
}

interface GalleryListResponse {
    galleries: Gallery[]
}

interface UploadResponse {
    files: Array<{
        photoId?: string
        originalName: string
        bytes: number
        status: 'queued' | 'rejected'
        reason?: string
    }>
}

interface SharedGalleryResponse {
    gallery: {
        slug: string
        title: string
        description: string | null
        eventDate: string | null
        coverPhotoId: string | null
    }
    photos: Array<
        GalleryPhoto & {
            thumbnailUrl: string
            displayUrl: string
            originalUrl: string
        }
    >
}

@Injectable({ providedIn: 'root' })
export class GalleryApiService {
    private readonly http = inject(HttpClient)
    readonly busy = signal(false)

    setup(setupToken: string, password: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(
            '/api/auth/setup',
            { password },
            {
                headers: { 'X-Setup-Token': setupToken },
                withCredentials: true,
            },
        )
    }

    signIn(password: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(
            '/api/auth/sign-in',
            { password },
            {
                withCredentials: true,
            },
        )
    }

    signOut(): Observable<void> {
        return this.http.post<void>(
            '/api/auth/sign-out',
            {},
            {
                headers: this.csrfHeaders(),
                withCredentials: true,
            },
        )
    }

    listGalleries(): Observable<Gallery[]> {
        return this.http
            .get<GalleryListResponse>('/api/admin/galleries', {
                withCredentials: true,
            })
            .pipe(map((response) => response.galleries))
    }

    createGallery(input: { title: string; description: string | null; eventDate: string | null }): Observable<Gallery> {
        return this.http.post<Gallery>('/api/admin/galleries', input, {
            headers: this.csrfHeaders(),
            withCredentials: true,
        })
    }

    updateGallery(id: string, input: { title: string; description: string | null; eventDate: string | null }): Observable<Gallery> {
        return this.http.patch<Gallery>(`/api/admin/galleries/${id}`, input, {
            headers: this.csrfHeaders(),
            withCredentials: true,
        })
    }

    listPhotos(id: string): Observable<{ files: GalleryPhoto[] }> {
        return this.http.get<{ files: GalleryPhoto[] }>(`/api/admin/galleries/${id}/photos`, {
            withCredentials: true,
        })
    }

    upload(id: string, files: File[]): Observable<{ progress: number; response?: UploadResponse }> {
        const body = new FormData()
        for (const file of files) {
            body.append('files', file, file.name)
        }

        return this.http
            .post<UploadResponse>(`/api/admin/galleries/${id}/photos`, body, {
                headers: this.csrfHeaders(),
                withCredentials: true,
                observe: 'events',
                reportProgress: true,
            })
            .pipe(
                map((event: HttpEvent<UploadResponse>) => {
                    if (event.type === HttpEventType.UploadProgress) {
                        return { progress: event.total ? Math.round((event.loaded / event.total) * 100) : 0 }
                    }
                    if (event.type === HttpEventType.Response) {
                        return { progress: 100, response: event.body ?? undefined }
                    }
                    return { progress: 0 }
                }),
            )
    }

    cancelPhoto(galleryId: string, photoId: string): Observable<{ photoId: string; status: 'cancelled' }> {
        return this.http.post<{ photoId: string; status: 'cancelled' }>(
            `/api/admin/galleries/${galleryId}/photos/${photoId}/cancel`,
            {},
            {
                headers: this.csrfHeaders(),
                withCredentials: true,
            },
        )
    }

    setCover(galleryId: string, photoId: string): Observable<Gallery> {
        return this.http.patch<Gallery>(
            `/api/admin/galleries/${galleryId}/cover`,
            { photoId },
            {
                headers: this.csrfHeaders(),
                withCredentials: true,
            },
        )
    }

    publish(galleryId: string): Observable<{ gallery: Gallery; sharePath: string }> {
        return this.http.post<{ gallery: Gallery; sharePath: string }>(
            `/api/admin/galleries/${galleryId}/publish`,
            {},
            {
                headers: this.csrfHeaders(),
                withCredentials: true,
            },
        )
    }

    rotateLink(galleryId: string): Observable<{ gallery: Gallery; sharePath: string }> {
        return this.http.post<{ gallery: Gallery; sharePath: string }>(
            `/api/admin/galleries/${galleryId}/rotate-link`,
            {},
            {
                headers: this.csrfHeaders(),
                withCredentials: true,
            },
        )
    }

    unpublish(galleryId: string): Observable<Gallery> {
        return this.http.post<Gallery>(
            `/api/admin/galleries/${galleryId}/unpublish`,
            {},
            {
                headers: this.csrfHeaders(),
                withCredentials: true,
            },
        )
    }

    exchangeShare(slug: string, token: string): Observable<{ slug: string; expiresAt: string }> {
        return this.http.post<{ slug: string; expiresAt: string }>(
            `/api/share/${encodeURIComponent(slug)}/${encodeURIComponent(token)}/session`,
            {},
            {
                withCredentials: true,
            },
        )
    }

    sharedGallery(slug: string): Observable<SharedGalleryResponse> {
        return this.http.get<SharedGalleryResponse>(`/api/shared/galleries/${encodeURIComponent(slug)}`, {
            withCredentials: true,
        })
    }

    private csrfHeaders(): HttpHeaders {
        const token = document.cookie
            .split('; ')
            .find((cookie) => cookie.startsWith('gallery_admin_csrf='))
            ?.split('=')[1]
        return token ? new HttpHeaders({ 'X-CSRF-Token': decodeURIComponent(token) }) : new HttpHeaders()
    }
}
