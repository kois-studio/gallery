import { CommonModule } from '@angular/common'
import { Component, OnInit, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { Gallery, GalleryApiService, GalleryPhoto } from '../api/gallery-api.service'

@Component({
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <main class="admin-page">
      <header class="app-header">
        <a class="wordmark" routerLink="/">Kois Gallery</a>
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

        <section class="workspace" aria-live="polite">
          @if (selected(); as gallery) {
            <div class="workspace-header">
              <div>
                <p class="eyebrow">{{ gallery.status === 'published' ? 'Published gallery' : 'Draft gallery' }}</p>
                <h2>{{ gallery.title }}</h2>
                <p class="muted">/{{ gallery.slug }}</p>
              </div>
              <div class="workspace-actions">
                @if (gallery.status === 'draft') {
                  <button class="primary-button" type="button" (click)="publish()" [disabled]="busy()">Publish gallery</button>
                } @else {
                  <button class="secondary-button" type="button" (click)="rotate()" [disabled]="busy()">Rotate link</button>
                  <button class="text-button" type="button" (click)="unpublish()" [disabled]="busy()">Unpublish</button>
                }
              </div>
            </div>

            @if (sharePath()) {
              <div class="share-banner" role="status">
                <span>Share path ready: <code>{{ sharePath() }}</code></span>
                <button class="secondary-button" type="button" (click)="copySharePath()">Copy path</button>
              </div>
            }

            <section class="upload-panel" aria-labelledby="upload-title">
              <div>
                <p class="eyebrow">Delivery workspace</p>
                <h3 id="upload-title">Add photographs</h3>
                <p class="muted">JPEG, PNG, or WebP · up to 100 MiB per file</p>
              </div>
              @if (gallery.status === 'draft') {
                <label class="upload-dropzone" for="photo-files">
                  <span class="upload-icon" aria-hidden="true">↑</span>
                  <strong>Choose a batch</strong>
                  <span>or drop files here</span>
                  <input id="photo-files" type="file" accept="image/jpeg,image/png,image/webp" multiple (change)="upload($event)" />
                </label>
              }
              @if (uploadProgress() > 0 && uploadProgress() < 100) {
                <div class="progress" role="progressbar" [attr.aria-valuenow]="uploadProgress()" aria-valuemin="0" aria-valuemax="100"><span [style.width.%]="uploadProgress()"></span></div>
                <p class="muted">Uploading {{ uploadProgress() }}%</p>
              }
            </section>

            <section class="photo-section" aria-labelledby="photos-title">
              <div class="section-heading"><h3 id="photos-title">Photographs</h3><span class="count">{{ photos().length }}</span></div>
              @if (photos().length) {
                <div class="admin-photo-grid">
                  @for (photo of photos(); track photo.photoId) {
                    <article class="admin-photo-card" [class.cover]="gallery.coverPhotoId === photo.photoId">
                      @if (photo.status === 'ready' && photo.displayUrl) { <img [src]="photo.displayUrl" [alt]="photo.originalName" loading="lazy" /> }
                      @else { <div class="photo-placeholder"><span>{{ photo.status }}</span></div> }
                      <div class="photo-card-footer"><span>{{ photo.originalName }}</span>@if (photo.status === 'ready' && gallery.status === 'draft') { <button class="text-button" type="button" (click)="setCover(photo.photoId)">{{ gallery.coverPhotoId === photo.photoId ? 'Cover' : 'Set cover' }}</button> }</div>
                    </article>
                  }
                </div>
              } @else { <p class="empty-state">No photographs yet. Add a batch to start building this gallery.</p> }
            </section>
          } @else {
            <div class="welcome-state"><p class="eyebrow">Your workspace</p><h2>Make space for the moment.</h2><p class="muted">Create a draft gallery to begin uploading and preparing a private delivery.</p><button class="primary-button" type="button" (click)="startNew()">Create your first gallery</button></div>
          }
        </section>
      </div>
      @if (error()) { <p class="toast error" role="alert">{{ error() }}</p> }
    </main>
  `,
})
export class AdminComponent implements OnInit {
    private readonly api = inject(GalleryApiService)
    private readonly router = inject(Router)
    readonly galleries = signal<Gallery[]>([])
    readonly selected = signal<Gallery | undefined>(undefined)
    readonly photos = signal<GalleryPhoto[]>([])
    readonly loading = signal(true)
    readonly busy = signal(false)
    readonly uploadProgress = signal(0)
    readonly error = signal('')
    readonly sharePath = signal('')
    newTitle = ''

    ngOnInit(): void {
        this.load()
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
                this.error.set('Your session may have expired. Please sign in again.')
            },
        })
    }

    select(gallery: Gallery): void {
        this.selected.set(gallery)
        this.sharePath.set('')
        this.api.listPhotos(gallery.id).subscribe({
            next: (response) => this.photos.set(response.files),
            error: () => this.error.set('Photographs could not be loaded.'),
        })
    }

    startNew(): void {
        this.newTitle = ''
    }

    create(): void {
        if (!this.newTitle.trim()) return
        this.busy.set(true)
        this.api.createGallery({ title: this.newTitle, description: null, eventDate: null }).subscribe({
            next: (gallery) => {
                this.galleries.update((items) => [gallery, ...items])
                this.selected.set(gallery)
                this.photos.set([])
                this.newTitle = ''
                this.busy.set(false)
            },
            error: () => {
                this.error.set('The gallery could not be created.')
                this.busy.set(false)
            },
        })
    }

    upload(event: Event): void {
        const input = event.target as HTMLInputElement
        const files = input.files ? Array.from(input.files) : []
        const gallery = this.selected()
        if (!gallery || !files.length) return
        this.busy.set(true)
        this.uploadProgress.set(1)
        this.api.upload(gallery.id, files).subscribe({
            next: (result) => {
                this.uploadProgress.set(result.progress)
                if (result.response) this.refreshSelected(gallery)
            },
            error: (error) => {
                this.error.set(error.error?.message ?? 'The upload failed.')
                this.busy.set(false)
                this.uploadProgress.set(0)
            },
            complete: () => {
                this.busy.set(false)
                input.value = ''
            },
        })
    }

    refreshSelected(gallery: Gallery): void {
        this.api.listPhotos(gallery.id).subscribe({
            next: (response) => {
                this.photos.set(response.files)
                if (response.files.some((photo) => photo.status === 'pending' || photo.status === 'processing')) {
                    setTimeout(() => this.refreshSelected(gallery), 500)
                }
            },
        })
    }

    setCover(photoId: string): void {
        const gallery = this.selected()
        if (!gallery) return
        this.api
            .setCover(gallery.id, photoId)
            .subscribe({ next: (updated) => this.selected.set(updated), error: () => this.error.set('The cover could not be selected.') })
    }

    publish(): void {
        const gallery = this.selected()
        if (!gallery) return
        this.busy.set(true)
        this.api.publish(gallery.id).subscribe({
            next: (result) => {
                this.selected.set(result.gallery)
                this.replaceGallery(result.gallery)
                this.sharePath.set(result.sharePath)
                this.busy.set(false)
            },
            error: (error) => {
                this.error.set(error.error?.message ?? 'Gallery is not ready to publish.')
                this.busy.set(false)
            },
        })
    }

    rotate(): void {
        const gallery = this.selected()
        if (!gallery) return
        this.busy.set(true)
        this.api.rotateLink(gallery.id).subscribe({
            next: (result) => {
                this.selected.set(result.gallery)
                this.sharePath.set(result.sharePath)
                this.busy.set(false)
            },
            error: () => {
                this.error.set('The share link could not be rotated.')
                this.busy.set(false)
            },
        })
    }

    unpublish(): void {
        const gallery = this.selected()
        if (!gallery) return
        this.busy.set(true)
        this.api.unpublish(gallery.id).subscribe({
            next: (updated) => {
                this.selected.set(updated)
                this.replaceGallery(updated)
                this.sharePath.set('')
                this.busy.set(false)
            },
            error: () => {
                this.error.set('The gallery could not be unpublished.')
                this.busy.set(false)
            },
        })
    }

    copySharePath(): void {
        void navigator.clipboard?.writeText(this.sharePath())
    }

    signOut(): void {
        this.api.signOut().subscribe({ next: () => this.router.navigateByUrl('/login'), error: () => this.router.navigateByUrl('/login') })
    }

    private replaceGallery(updated: Gallery): void {
        this.galleries.update((items) => items.map((item) => (item.id === updated.id ? updated : item)))
    }
}
