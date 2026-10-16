import { CommonModule } from '@angular/common'
import { HttpErrorResponse } from '@angular/common/http'
import { Component, ElementRef, HostListener, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { switchMap } from 'rxjs'
import { GalleryApiService, SharedGallery, SharedPhoto } from '../api/gallery-api.service'

const swipeThresholdPx = 50

/**
 * Visitor delivery page. It is served from the share link itself (`/g/:slug/:token`) and exchanges the token on
 * every load, so a bookmarked page keeps working until the photographer replaces the link or takes it offline.
 */
@Component({
    standalone: true,
    imports: [CommonModule],
    template: `
    <main class="visitor-page">
      @if (loading()) { <div class="center-state"><div class="spinner" aria-hidden="true"></div><p>Opening your gallery…</p></div> }
      @if (unavailable()) {
        <div class="center-state unavailable">
          <p class="eyebrow">Private gallery</p>
          <h1>This link isn’t available.</h1>
          <p class="muted">It may have been replaced or taken offline. Ask the photographer for the current link.</p>
        </div>
      }
      @if (gallery(); as current) {
        <header class="visitor-hero" [class.has-cover]="cover()">
          @if (cover(); as coverPhoto) { <img class="visitor-hero-image" [src]="coverPhoto.displayUrl" alt="" fetchpriority="high" /> }
          <div class="visitor-hero-text">
            @if (formattedDate()) { <p class="eyebrow">{{ formattedDate() }}</p> }
            <h1>{{ current.title }}</h1>
            @if (current.description) { <p class="visitor-description">{{ current.description }}</p> }
            <a class="visitor-hero-link" href="#photographs" (click)="scrollToPhotos($event)">View {{ photos().length }} photographs</a>
          </div>
        </header>

        <section class="visitor-grid" id="photographs" aria-label="Photographs">
          @for (photo of photos(); track photo.photoId; let index = $index) {
            <button
              class="visitor-photo"
              type="button"
              [attr.data-index]="index"
                            [style.--ratio]="ratio(photo)"
              [attr.aria-label]="'Open photograph ' + (index + 1) + ' of ' + photos().length"
              (click)="open(index)"
            >
              <img [src]="photo.thumbnailUrl" alt="" loading="lazy" decoding="async" />
            </button>
          } @empty {
            <p class="empty-state">There are no photographs in this gallery yet.</p>
          }
          <span class="visitor-grid-filler" aria-hidden="true"></span>
        </section>
        <footer class="visitor-footer">Delivered privately with Gallery</footer>
      }

      @if (selected(); as photo) {
        <div
          class="lightbox"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="'Photograph ' + (selectedIndex()! + 1) + ' of ' + photos().length"
          (pointerdown)="onPointerDown($event)"
          (pointerup)="onPointerUp($event)"
        >
          <div class="lightbox-bar">
            <span class="lightbox-counter">{{ selectedIndex()! + 1 }} / {{ photos().length }}</span>
            <div class="lightbox-bar-actions">
              <a class="lightbox-download" [href]="photo.originalUrl" download [title]="photo.originalName">Download</a>
              <button #closeButton class="lightbox-icon" type="button" aria-label="Close" (click)="close()">×</button>
            </div>
          </div>
          <div class="lightbox-stage" (click)="onStageClick($event)">
            <img class="lightbox-placeholder" [src]="photo.thumbnailUrl" alt="" aria-hidden="true" />
            <img class="lightbox-image" [src]="photo.displayUrl" [alt]="'Photograph ' + (selectedIndex()! + 1) + ' of ' + photos().length" />
          </div>
          @if (photos().length > 1) {
            <button class="lightbox-nav previous" type="button" aria-label="Previous photograph" (click)="step(-1)">‹</button>
            <button class="lightbox-nav next" type="button" aria-label="Next photograph" (click)="step(1)">›</button>
          }
        </div>
      }
    </main>
  `,
})
export class SharedGalleryComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute)
    private readonly api = inject(GalleryApiService)
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)
    private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton')
    readonly loading = signal(true)
    readonly unavailable = signal(false)
    readonly gallery = signal<SharedGallery | undefined>(undefined)
    readonly photos = signal<SharedPhoto[]>([])
    readonly selectedIndex = signal<number | undefined>(undefined)
    readonly selected = computed(() => {
        const index = this.selectedIndex()
        return index === undefined ? undefined : this.photos()[index]
    })
    readonly cover = computed(() => {
        const coverId = this.gallery()?.coverPhotoId
        return this.photos().find((photo) => photo.photoId === coverId) ?? this.photos()[0]
    })
    readonly formattedDate = computed(() => {
        const date = this.gallery()?.eventDate
        if (!date) return ''
        return new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(`${date}T00:00:00`))
    })
    private pointerStartX?: number
    private previousTitle = document.title

    ngOnInit(): void {
        const slug = this.route.snapshot.paramMap.get('slug') ?? ''
        const token = this.route.snapshot.paramMap.get('token')
        const request = token
            ? this.api.exchangeShare(slug, token).pipe(switchMap(() => this.api.sharedGallery(slug)))
            : this.api.sharedGallery(slug)
        request.subscribe({
            next: (response) => {
                this.gallery.set(response.gallery)
                this.photos.set(response.photos)
                document.title = response.gallery.title
                this.loading.set(false)
            },
            error: (_error: HttpErrorResponse) => {
                this.unavailable.set(true)
                this.loading.set(false)
            },
        })
    }

    ngOnDestroy(): void {
        document.title = this.previousTitle
        document.body.classList.remove('lightbox-open')
    }

    ratio(photo: SharedPhoto): number {
        return photo.width && photo.height ? photo.width / photo.height : 1.5
    }

    scrollToPhotos(event: Event): void {
        event.preventDefault()
        document.getElementById('photographs')?.scrollIntoView({ behavior: 'smooth' })
    }

    open(index: number): void {
        this.selectedIndex.set(index)
        document.body.classList.add('lightbox-open')
        this.preloadNeighbours(index)
        setTimeout(() => this.closeButton()?.nativeElement.focus())
    }

    close(): void {
        const index = this.selectedIndex()
        if (index === undefined) return
        this.selectedIndex.set(undefined)
        document.body.classList.remove('lightbox-open')
        this.host.nativeElement.querySelector<HTMLButtonElement>(`.visitor-photo[data-index="${index}"]`)?.focus()
    }

    step(delta: number): void {
        const index = this.selectedIndex()
        const count = this.photos().length
        if (index === undefined || count === 0) return
        const next = (index + delta + count) % count
        this.selectedIndex.set(next)
        this.preloadNeighbours(next)
    }

    onStageClick(event: MouseEvent): void {
        if (event.target === event.currentTarget) this.close()
    }

    onPointerDown(event: PointerEvent): void {
        if (event.pointerType !== 'mouse') this.pointerStartX = event.clientX
    }

    onPointerUp(event: PointerEvent): void {
        if (this.pointerStartX === undefined) return
        const distance = event.clientX - this.pointerStartX
        this.pointerStartX = undefined
        if (Math.abs(distance) >= swipeThresholdPx) this.step(distance < 0 ? 1 : -1)
    }

    @HostListener('document:keydown', ['$event'])
    onKeydown(event: KeyboardEvent): void {
        if (this.selectedIndex() === undefined) return
        if (event.key === 'Escape') this.close()
        else if (event.key === 'ArrowRight') this.step(1)
        else if (event.key === 'ArrowLeft') this.step(-1)
        else if (event.key === 'Tab') this.trapFocus(event)
    }

    private trapFocus(event: KeyboardEvent): void {
        const focusable = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('.lightbox a, .lightbox button'))
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
        }
    }

    private preloadNeighbours(index: number): void {
        const photos = this.photos()
        for (const offset of [1, -1]) {
            const neighbour = photos[(index + offset + photos.length) % photos.length]
            if (neighbour) new Image().src = neighbour.displayUrl
        }
    }
}
