import { CommonModule } from '@angular/common'
import { Component, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { GalleryApiService } from '../api/gallery-api.service'

@Component({
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <main class="auth-page">
      <a class="back-link" routerLink="/">Kois Gallery</a>
      <section class="auth-card" aria-labelledby="setup-title">
        <p class="eyebrow">First-run setup</p>
        <h1 id="setup-title">Make it yours.</h1>
        <p class="muted">This one-time setup creates the local administrator for this installation.</p>
        <form (ngSubmit)="submit()" #form="ngForm">
          <label for="setupToken">Setup token</label>
          <input id="setupToken" name="setupToken" [(ngModel)]="setupToken" required autocomplete="off" />
          <label for="password">Administrator password</label>
          <input id="password" name="password" type="password" [(ngModel)]="password" required minlength="12" autocomplete="new-password" />
          <label for="confirmPassword">Repeat password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" [(ngModel)]="confirmPassword" required minlength="12" autocomplete="new-password" />
          @if (password && confirmPassword && password !== confirmPassword) { <p class="field-error">Passwords do not match.</p> }
          <button class="primary-button" type="submit" [disabled]="form.invalid || password !== confirmPassword || busy()">
            {{ busy() ? 'Creating administrator…' : 'Create administrator' }}
          </button>
        </form>
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <p class="small-note">Already configured? <a routerLink="/login">Sign in</a></p>
      </section>
    </main>
  `,
})
export class SetupComponent {
    private readonly api = inject(GalleryApiService)
    private readonly router = inject(Router)
    setupToken = ''
    password = ''
    confirmPassword = ''
    readonly busy = signal(false)
    readonly error = signal('')

    submit(): void {
        this.busy.set(true)
        this.error.set('')
        this.api.setup(this.setupToken, this.password).subscribe({
            next: () => this.router.navigateByUrl('/admin'),
            error: (error) => {
                this.error.set(error.error?.message ?? 'Setup failed. Check the operator token and try again.')
                this.busy.set(false)
            },
            complete: () => this.busy.set(false),
        })
    }
}
