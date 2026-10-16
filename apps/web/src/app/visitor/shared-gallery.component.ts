import { CommonModule } from '@angular/common'
import { Component, HostListener, OnInit, inject, signal } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { GalleryApiService } from '../api/gallery-api.service'

@Component({
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <main class="visitor-page">
      @if (loading()) { <div class="center-state"><div class="spinner" aria-hidden="true"></div><p>Loading gallery…</p></div> }
      @if (error()) { <div class="center-state"><p class="error">This gallery link is no longer available.</p><a routerLink="/" class="secondary-button">Return home</a></div> }
      @if (gallery(); as current) {
        <header class="visitor-header"><a class="wordmark" routerLink="/">Gallery</a><span>Private delivery</span></header>
        <section class="visitor-intro"><p class="eyebrow">{{ current.eventDate || 'A collection of photographs' }}</p><h1>{{ current.title }}</h1>@if (current.description) { <p class="muted">{{ current.description }}</p> }<div class="visitor-meta"><span>{{ photos().length }} photographs</span><span>Private link</span></div></section>
        <section class="visitor-grid" aria-label="Photographs">
          @for (photo of photos(); track photo.photoId) {
            <button class="visitor-photo" type="button" (click)="openPhoto(photo)">
              <img [src]="photo.thumbnailUrl" [alt]="photo.originalName" loading="lazy" />
              <span class="photo-overlay"><span>{{ photo.originalName }}</span><span>View</span></span>
            </button>
          } @empty {
            <p class="empty-state">This gallery does not have any ready photographs yet.</p>
          }
        </section>
      }
      @if (selectedPhoto(); as photo) {
        <div class="lightbox-backdrop" role="presentation" (click)="closePhoto()">
          <section class="lightbox" role="dialog" aria-modal="true" aria-labelledby="lightbox-title" (click)="$event.stopPropagation()">
            <div class="lightbox-header">
              <p id="lightbox-title">{{ photo.originalName }}</p>
              <button class="close-button" type="button" aria-label="Close photograph" (click)="closePhoto()">×</button>
            </div>
            <img class="lightbox-image" [src]="photo.displayUrl" [alt]="photo.originalName" />
            <div class="lightbox-actions">
              <a class="primary-button" [href]="photo.originalUrl" download>Download original</a>
              <button class="secondary-button" type="button" (click)="closePhoto()">Close</button>
            </div>
          </section>
        </div>
      }
    </main>
  `,
})
export class SharedGalleryComponent implements OnInit {
    private readonly route = inject(ActivatedRoute)
    private readonly api = inject(GalleryApiService)
    readonly loading = signal(true)
    readonly error = signal(false)
    readonly gallery = signal<{ title: string; description: string | null; eventDate: string | null } | undefined>(undefined)
    readonly selectedPhoto = signal<GalleryPhoto | undefined>(undefined)
    readonly photos = signal<
        Array<{ photoId: string; originalName: string; thumbnailUrl: string; displayUrl: string; originalUrl: string }>
    >([])

    ngOnInit(): void {
        const slug = this.route.snapshot.paramMap.get('slug') ?? ''
        this.api.sharedGallery(slug).subscribe({
            next: (response) => {
                this.gallery.set(response.gallery)
                this.photos.set(response.photos)
                this.loading.set(false)
            },
            error: () => {
                this.error.set(true)
                this.loading.set(false)
            },
        })
    }

    openPhoto(photo: GalleryPhoto): void {
        this.selectedPhoto.set(photo)
    }

    closePhoto(): void {
        this.selectedPhoto.set(undefined)
    }

    @HostListener('document:keydown.escape')
    closeOnEscape(): void {
        this.closePhoto()
    }
}

interface GalleryPhoto {
    photoId: string
    originalName: string
    thumbnailUrl: string
    displayUrl: string
    originalUrl: string
}
