import { CommonModule } from '@angular/common'
import { HttpErrorResponse } from '@angular/common/http'
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { finalize } from 'rxjs'
import { Gallery, GalleryApiService, GalleryPhoto } from '../api/gallery-api.service'

const uploadConcurrency = 3
const maximumUploadAttempts = 3
const maximumFileBytes = 100 * 1024 * 1024
const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp']

interface UploadItem {
    id: number
    galleryId: string
    file: File
    status: 'queued' | 'uploading' | 'done' | 'rejected' | 'failed'
    progress: number
    attempts: number
    reason?: string
}

@Component({
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <main class="admin-page">
      <header class="app-header">
        <a class="wordmark" routerLink="/admin">Gallery</a>
        <div class="header-actions">
          <span class="operator-label">Local administrator</span>
          <button class="text-button" type="button" (click)="signOut()">Sign out</button>
        </div>
      </header>

      <div class="admin-layout">
        <aside class="sidebar" aria-label="Gallery management">
          <div class="sidebar-heading">
            <div>
              <p class="eyebrow">Workspace</p>
              <h1>Galleries</h1>
            </div>
            <button class="icon-button" type="button" aria-label="Create gallery" (click)="startNew()">+</button>
          </div>
          <form class="new-gallery" (ngSubmit)="create()" #newForm="ngForm">
            <label for="newTitle">New gallery</label>
            <input id="newTitle" name="newTitle" [(ngModel)]="newTitle" placeholder="e.g. Summer wedding" required />
            <button class="secondary-button" type="submit" [disabled]="newForm.invalid || busy()">Create draft</button>
          </form>
          @if (loading()) { <p class="muted">Loading galleries…</p> }
          <nav class="gallery-list" aria-label="Your galleries">
            @for (gallery of galleries(); track gallery.id) {
              <button class="gallery-list-item" [class.selected]="selected()?.id === gallery.id" type="button" (click)="select(gallery)">
                <span>{{ gallery.title }}</span><small>{{ gallery.status }}</small>
              </button>
            } @empty {
              @if (!loading()) { <p class="empty-note">Your first gallery is waiting.</p> }
            }
          </nav>
        </aside>

        <section class="workspace">
          @if (selected(); as gallery) {
            <div class="workspace-header">
              <div>
                <p class="eyebrow">{{ gallery.status === 'published' ? 'Published gallery' : 'Draft gallery' }}</p>
                <h2>{{ gallery.title }}</h2>
                <p class="muted">/{{ gallery.slug }} · {{ readyCount() }} of {{ photos().length }} ready</p>
              </div>
              <div class="workspace-actions">
                @if (gallery.status === 'draft') {
                  <button class="primary-button" type="button" (click)="publish()" [disabled]="busy() || !gallery.coverPhotoId">Publish gallery</button>
                } @else {
                  <button class="secondary-button" type="button" (click)="unpublish()" [disabled]="busy()">Take offline</button>
                }
                <button class="text-button danger" type="button" (click)="deleteGallery()" [disabled]="busy()">Delete</button>
              </div>
            </div>

            @if (gallery.status === 'draft' && !gallery.coverPhotoId && readyCount() > 0) {
              <p class="hint">Choose a cover photograph to publish this gallery.</p>
            }

            @if (gallery.status === 'published') {
              <section class="share-panel" aria-labelledby="share-title">
                <div>
                  <p class="eyebrow" id="share-title">Client link</p>
                  @if (shareUrl(); as url) {
                    <code>{{ url }}</code>
                    <p class="small-note">Anyone with this link can view and download the gallery. Replace it if it was shared with the wrong person.</p>
                  } @else {
                    <p class="small-note">This gallery was published before links could be copied again. Create a new link to get one; the old link stops working.</p>
                  }
                </div>
                <div class="share-actions">
                  @if (shareUrl(); as url) {
                    <button class="primary-button" type="button" (click)="copyShareUrl(url)">{{ copied() ? 'Copied' : 'Copy link' }}</button>
                    <a class="secondary-button" [href]="url" target="_blank" rel="noopener">Open</a>
                  }
                  <button class="text-button" type="button" (click)="rotate()" [disabled]="busy()">{{ shareUrl() ? 'Replace link' : 'Create link' }}</button>
                </div>
              </section>
            }

            <details class="details-panel">
              <summary>Gallery details</summary>
              <form (ngSubmit)="saveDetails()" #detailsForm="ngForm">
                <label for="detailTitle">Title</label>
                <input id="detailTitle" name="detailTitle" [(ngModel)]="details.title" required maxlength="160" />
                <label for="detailDate">Event date</label>
                <input id="detailDate" name="detailDate" type="date" [(ngModel)]="details.eventDate" />
                <label for="detailDescription">Description</label>
                <textarea id="detailDescription" name="detailDescription" rows="3" maxlength="2000" [(ngModel)]="details.description"></textarea>
                <button class="secondary-button" type="submit" [disabled]="detailsForm.invalid || busy()">Save details</button>
              </form>
            </details>

            <section class="upload-panel" aria-labelledby="upload-title">
              <div>
                <p class="eyebrow">Delivery workspace</p>
                <h3 id="upload-title">Add photographs</h3>
                <p class="muted">JPEG, PNG, or WebP · up to 100 MiB per file. New photographs appear for visitors once processed.</p>
              </div>
              <label
                class="upload-dropzone"
                [class.dragging]="dragging()"
                for="photo-files"
                (dragover)="onDragOver($event)"
                (dragleave)="dragging.set(false)"
                (drop)="onDrop($event)"
              >
                <span class="upload-icon" aria-hidden="true">↑</span>
                <strong>Choose photographs</strong>
                <span>or drop them here</span>
                <input id="photo-files" class="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple (change)="onFilesChosen($event)" />
              </label>
              @if (uploadSummary(); as summary) {
                <div class="upload-status" aria-live="polite">
                  <div class="progress" role="progressbar" [attr.aria-valuenow]="summary.percent" aria-valuemin="0" aria-valuemax="100"><span [style.width.%]="summary.percent"></span></div>
                  <p class="muted">
                    @if (summary.active) { Uploading {{ summary.done }} of {{ summary.total }} · {{ summary.percent }}% } @else { Uploaded {{ summary.done }} of {{ summary.total }} }
                    @if (summary.problems) { · {{ summary.problems }} not uploaded }
                  </p>
                  @for (item of problemUploads(); track item.id) {
                    <p class="upload-problem"><span>{{ item.file.name }}: {{ item.reason }}</span>@if (item.status === 'failed') { <button class="text-button" type="button" (click)="retryUpload(item)">Try again</button> }</p>
                  }
                  @if (!summary.active) { <button class="text-button" type="button" (click)="clearUploads()">Dismiss</button> }
                </div>
              }
            </section>

            <section class="photo-section" aria-labelledby="photos-title">
              <div class="section-heading"><h3 id="photos-title">Photographs</h3><span class="count">{{ photos().length }}</span></div>
              @if (photos().length) {
                <div class="admin-photo-grid">
                  @for (photo of photos(); track photo.photoId) {
                    <article class="admin-photo-card" [class.cover]="gallery.coverPhotoId === photo.photoId">
                      @if (photo.status === 'ready' && photo.thumbnailUrl) { <img [src]="photo.thumbnailUrl" [alt]="photo.originalName" loading="lazy" decoding="async" /> }
                      @else { <div class="photo-placeholder" [class.failed]="photo.status === 'failed' || photo.status === 'cancelled'"><span>{{ photo.status }}</span></div> }
                      @if (gallery.coverPhotoId === photo.photoId) { <span class="cover-badge">Cover</span> }
                      <div class="photo-card-footer">
                        <span [title]="photo.originalName">{{ photo.originalName }}</span>
                        <span class="photo-card-actions">
                          @if (photo.status === 'ready' && gallery.coverPhotoId !== photo.photoId) { <button class="text-button" type="button" (click)="setCover(photo.photoId)">Set cover</button> }
                          @if (photo.status === 'pending' || photo.status === 'processing') { <button class="text-button" type="button" (click)="cancelPhoto(photo.photoId)">Cancel</button> }
                          @if (photo.status === 'failed') { <button class="text-button" type="button" (click)="retryPhoto(photo.photoId)">Retry</button> }
                          <button class="text-button danger" type="button" [attr.aria-label]="'Delete ' + photo.originalName" (click)="deletePhoto(photo)">Delete</button>
                        </span>
                      </div>
                      @if (photo.processingError) { <p class="photo-error">{{ photo.processingError }}</p> }
                    </article>
                  }
                </div>
              } @else { <p class="empty-state">No photographs yet. Add a batch to start building this gallery.</p> }
            </section>
          } @else {
            <div class="welcome-state"><p class="eyebrow">Your workspace</p><h2>Start with a gallery.</h2><p class="muted">Create a draft gallery to begin uploading and preparing a private delivery.</p><button class="primary-button" type="button" (click)="startNew()">Create your first gallery</button></div>
          }
        </section>
      </div>
      @if (error()) { <p class="toast error" role="alert">{{ error() }} <button class="text-button" type="button" (click)="error.set('')">Dismiss</button></p> }
    </main>
  `,
})
export class AdminComponent implements OnInit, OnDestroy {
    private readonly api = inject(GalleryApiService)
    private readonly router = inject(Router)
    readonly galleries = signal<Gallery[]>([])
    readonly selected = signal<Gallery | undefined>(undefined)
    readonly photos = signal<GalleryPhoto[]>([])
    readonly loading = signal(true)
    readonly busy = signal(false)
    readonly error = signal('')
    readonly copied = signal(false)
    readonly dragging = signal(false)
    readonly uploads = signal<UploadItem[]>([])
    readonly readyCount = computed(() => this.photos().filter((photo) => photo.status === 'ready').length)
    readonly shareUrl = computed(() => {
        const path = this.selected()?.sharePath
        return path ? `${window.location.origin}${path}` : undefined
    })
    readonly problemUploads = computed(() => this.uploads().filter((item) => item.status === 'rejected' || item.status === 'failed'))
    readonly uploadSummary = computed(() => {
        const items = this.uploads()
        if (!items.length) return undefined
        const accepted = items.filter((item) => item.status !== 'rejected')
        const totalBytes = accepted.reduce((total, item) => total + item.file.size, 0)
        const sentBytes = accepted.reduce(
            (total, item) => total + (item.file.size * (item.status === 'done' ? 100 : item.progress)) / 100,
            0,
        )
        return {
            total: items.length,
            done: items.filter((item) => item.status === 'done').length,
            problems: items.filter((item) => item.status === 'rejected' || item.status === 'failed').length,
            active: items.some((item) => item.status === 'queued' || item.status === 'uploading'),
            percent: totalBytes ? Math.round((sentBytes / totalBytes) * 100) : 100,
        }
    })
    newTitle = ''
    details = { title: '', eventDate: '', description: '' }
    private uploadSequence = 0
    private activeUploads = 0
    private pollTimer?: ReturnType<typeof setTimeout>

    ngOnInit(): void {
        this.load()
    }

    ngOnDestroy(): void {
        clearTimeout(this.pollTimer)
    }

    load(): void {
        this.loading.set(true)
        this.api.listGalleries().subscribe({
            next: (galleries) => {
                this.galleries.set(galleries)
                this.loading.set(false)
                if (!this.selected() && galleries[0]) this.select(galleries[0])
            },
            error: () => {
                this.loading.set(false)
                this.router.navigate(['/login'])
            },
        })
    }

    select(gallery: Gallery): void {
        this.setSelected(gallery)
        this.copied.set(false)
        this.photos.set([])
        this.refreshPhotos()
    }

    startNew(): void {
        this.newTitle = ''
        document.getElementById('newTitle')?.focus()
    }

    create(): void {
        if (!this.newTitle.trim()) return
        this.busy.set(true)
        this.api.createGallery({ title: this.newTitle, description: null, eventDate: null }).subscribe({
            next: (gallery) => {
                this.galleries.update((items) => [gallery, ...items])
                this.select(gallery)
                this.newTitle = ''
                this.busy.set(false)
            },
            error: (error) => this.fail(error, 'The gallery could not be created.'),
        })
    }

    saveDetails(): void {
        const gallery = this.selected()
        if (!gallery) return
        this.busy.set(true)
        this.api
            .updateGallery(gallery.id, {
                title: this.details.title.trim(),
                description: this.details.description.trim() || null,
                eventDate: this.details.eventDate || null,
            })
            .subscribe({
                next: (updated) => {
                    this.setSelected(updated)
                    this.busy.set(false)
                },
                error: (error) => this.fail(error, 'The details could not be saved.'),
            })
    }

    deleteGallery(): void {
        const gallery = this.selected()
        if (!gallery) return
        const warning =
            gallery.status === 'published'
                ? `Delete “${gallery.title}”? The client link stops working and all ${this.photos().length} photographs are removed from storage.`
                : `Delete “${gallery.title}” and its ${this.photos().length} photographs?`
        if (!window.confirm(warning)) return
        this.busy.set(true)
        this.api.deleteGallery(gallery.id).subscribe({
            next: () => {
                const remaining = this.galleries().filter((item) => item.id !== gallery.id)
                this.galleries.set(remaining)
                this.selected.set(undefined)
                this.photos.set([])
                if (remaining[0]) this.select(remaining[0])
                this.busy.set(false)
            },
            error: (error) => this.fail(error, 'The gallery could not be deleted.'),
        })
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault()
        this.dragging.set(true)
    }

    onDrop(event: DragEvent): void {
        event.preventDefault()
        this.dragging.set(false)
        this.enqueue(Array.from(event.dataTransfer?.files ?? []))
    }

    onFilesChosen(event: Event): void {
        const input = event.target as HTMLInputElement
        this.enqueue(Array.from(input.files ?? []))
        input.value = ''
    }

    retryUpload(item: UploadItem): void {
        this.patchUpload(item.id, { status: 'queued', progress: 0, attempts: 0, reason: undefined })
        this.pumpUploads()
    }

    clearUploads(): void {
        this.uploads.update((items) => items.filter((item) => item.status === 'queued' || item.status === 'uploading'))
    }

    setCover(photoId: string): void {
        const gallery = this.selected()
        if (!gallery) return
        this.api.setCover(gallery.id, photoId).subscribe({
            next: (updated) => this.setSelected(updated),
            error: (error) => this.fail(error, 'The cover could not be selected.'),
        })
    }

    cancelPhoto(photoId: string): void {
        const gallery = this.selected()
        if (!gallery) return
        this.api.cancelPhoto(gallery.id, photoId).subscribe({
            next: () => this.refreshPhotos(),
            error: (error) => this.fail(error, 'The photograph could not be cancelled.'),
        })
    }

    retryPhoto(photoId: string): void {
        const gallery = this.selected()
        if (!gallery) return
        this.api.retryPhoto(gallery.id, photoId).subscribe({
            next: () => this.refreshPhotos(),
            error: (error) => this.fail(error, 'The photograph could not be retried.'),
        })
    }

    deletePhoto(photo: GalleryPhoto): void {
        const gallery = this.selected()
        if (!gallery || !window.confirm(`Delete ${photo.originalName}? This removes the original from storage.`)) return
        this.api.deletePhoto(gallery.id, photo.photoId).subscribe({
            next: () => {
                this.photos.update((items) => items.filter((item) => item.photoId !== photo.photoId))
                if (gallery.coverPhotoId === photo.photoId) this.reloadSelected()
            },
            error: (error) => this.fail(error, 'The photograph could not be deleted.'),
        })
    }

    publish(): void {
        const gallery = this.selected()
        if (!gallery) return
        this.busy.set(true)
        this.api.publish(gallery.id).subscribe({
            next: (result) => {
                this.setSelected(result.gallery)
                this.busy.set(false)
            },
            error: (error) => this.fail(error, 'The gallery is not ready to publish.'),
        })
    }

    rotate(): void {
        const gallery = this.selected()
        if (!gallery) return
        if (gallery.sharePath && !window.confirm('Replace the client link? The current link stops working immediately.')) return
        this.busy.set(true)
        this.api.rotateLink(gallery.id).subscribe({
            next: (result) => {
                this.setSelected(result.gallery)
                this.copied.set(false)
                this.busy.set(false)
            },
            error: (error) => this.fail(error, 'The share link could not be replaced.'),
        })
    }

    unpublish(): void {
        const gallery = this.selected()
        if (!gallery) return
        this.busy.set(true)
        this.api.unpublish(gallery.id).subscribe({
            next: (updated) => {
                this.setSelected(updated)
                this.busy.set(false)
            },
            error: (error) => this.fail(error, 'The gallery could not be taken offline.'),
        })
    }

    copyShareUrl(url: string): void {
        void navigator.clipboard?.writeText(url).then(() => {
            this.copied.set(true)
            setTimeout(() => this.copied.set(false), 2000)
        })
    }

    signOut(): void {
        this.api.signOut().subscribe({ next: () => this.router.navigateByUrl('/login'), error: () => this.router.navigateByUrl('/login') })
    }

    private enqueue(files: File[]): void {
        const gallery = this.selected()
        if (!gallery || !files.length) return
        const items = files.map((file): UploadItem => {
            const reason = clientRejection(file)
            this.uploadSequence += 1
            return {
                id: this.uploadSequence,
                galleryId: gallery.id,
                file,
                status: reason ? 'rejected' : 'queued',
                progress: 0,
                attempts: 0,
                reason,
            }
        })
        this.uploads.update((current) => [...current.filter((item) => item.status !== 'done'), ...items])
        this.pumpUploads()
    }

    private pumpUploads(): void {
        while (this.activeUploads < uploadConcurrency) {
            const next = this.uploads().find((item) => item.status === 'queued')
            if (!next) return
            this.startUpload(next)
        }
    }

    private startUpload(item: UploadItem): void {
        this.activeUploads += 1
        const attempts = item.attempts + 1
        this.patchUpload(item.id, { status: 'uploading', progress: 0, attempts })
        this.api
            .uploadFile(item.galleryId, item.file)
            .pipe(
                finalize(() => {
                    this.activeUploads -= 1
                    this.pumpUploads()
                }),
            )
            .subscribe({
                next: ({ progress, response }) => {
                    if (!response) {
                        this.patchUpload(item.id, { progress })
                        return
                    }
                    const [result] = response.files
                    if (result?.status === 'rejected') {
                        this.patchUpload(item.id, { status: 'rejected', reason: result.reason ?? 'Not accepted' })
                    } else {
                        this.patchUpload(item.id, { status: 'done', progress: 100 })
                    }
                    if (this.selected()?.id === item.galleryId) this.refreshPhotos()
                },
                error: (error: HttpErrorResponse) => {
                    const retryable = error.status === 0 || error.status >= 500
                    if (retryable && attempts < maximumUploadAttempts) {
                        setTimeout(() => {
                            this.patchUpload(item.id, { status: 'queued', progress: 0 })
                            this.pumpUploads()
                        }, attempts * 1500)
                        this.patchUpload(item.id, { status: 'uploading', progress: 0 })
                        return
                    }
                    if (error.status === 401) {
                        this.router.navigate(['/login'])
                        return
                    }
                    const reason = error.status === 413 ? 'File exceeds the 100 MiB limit' : (error.error?.message ?? 'Upload failed')
                    this.patchUpload(item.id, { status: retryable ? 'failed' : 'rejected', reason })
                },
            })
    }

    private patchUpload(id: number, changes: Partial<UploadItem>): void {
        this.uploads.update((items) => items.map((item) => (item.id === id ? { ...item, ...changes } : item)))
    }

    private refreshPhotos(): void {
        const gallery = this.selected()
        if (!gallery) return
        clearTimeout(this.pollTimer)
        this.api.listPhotos(gallery.id).subscribe({
            next: (response) => {
                if (this.selected()?.id !== gallery.id) return
                this.photos.set(response.files)
                if (response.files.some((photo) => photo.status === 'pending' || photo.status === 'processing')) {
                    this.pollTimer = setTimeout(() => this.refreshPhotos(), 1000)
                }
            },
            error: (error) => this.fail(error, 'Photographs could not be loaded.'),
        })
    }

    private reloadSelected(): void {
        this.api.listGalleries().subscribe({
            next: (galleries) => {
                this.galleries.set(galleries)
                const current = galleries.find((item) => item.id === this.selected()?.id)
                if (current) this.setSelected(current)
            },
        })
    }

    private setSelected(gallery: Gallery): void {
        this.selected.set(gallery)
        this.galleries.update((items) => items.map((item) => (item.id === gallery.id ? gallery : item)))
        this.details = { title: gallery.title, eventDate: gallery.eventDate ?? '', description: gallery.description ?? '' }
    }

    private fail(error: unknown, fallback: string): void {
        this.busy.set(false)
        if (error instanceof HttpErrorResponse && error.status === 401) {
            this.router.navigate(['/login'])
            return
        }
        const message = error instanceof HttpErrorResponse ? error.error?.message : undefined
        this.error.set(typeof message === 'string' ? message : fallback)
    }
}

function clientRejection(file: File): string | undefined {
    // An empty type means the browser could not tell; the server inspects the bytes anyway.
    if (file.type && !acceptedTypes.includes(file.type)) return 'Only JPEG, PNG, and WebP images are accepted'
    if (file.size === 0) return 'The file is empty'
    if (file.size > maximumFileBytes) return 'File exceeds the 100 MiB limit'
    return undefined
}
