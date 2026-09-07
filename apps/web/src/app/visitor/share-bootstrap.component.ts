import { Component, OnInit, inject } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { GalleryApiService } from '../api/gallery-api.service'

@Component({
    standalone: true,
    template: `<main class="center-state"><div class="spinner" aria-hidden="true"></div><p>Opening your private gallery…</p></main>`,
})
export class ShareBootstrapComponent implements OnInit {
    private readonly route = inject(ActivatedRoute)
    private readonly router = inject(Router)
    private readonly api = inject(GalleryApiService)

    ngOnInit(): void {
        const slug = this.route.snapshot.paramMap.get('slug') ?? ''
        const token = this.route.snapshot.paramMap.get('token') ?? ''
        this.api.exchangeShare(slug, token).subscribe({
            next: (result) => this.router.navigate(['/shared', result.slug]),
            error: () => this.router.navigate(['/login'], { queryParams: { error: 'share' } }),
        })
    }
}
