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
      <a class="back-link" routerLink="/">Gallery</a>
      <section class="auth-card" aria-labelledby="login-title">
        <p class="eyebrow">Administrator access</p>
        <h1 id="login-title">Welcome back.</h1>
        <p class="muted">Sign in to manage your galleries and share your work.</p>
        <form (ngSubmit)="submit()" #form="ngForm">
          <label for="password">Password</label>
          <input id="password" name="password" type="password" [(ngModel)]="password" required minlength="12" autocomplete="current-password" />
          <button class="primary-button" type="submit" [disabled]="form.invalid || busy()">
            {{ busy() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <p class="small-note">Need to initialize this installation? <a routerLink="/setup">Open setup</a></p>
      </section>
    </main>
  `,
})
export class LoginComponent {
    private readonly api = inject(GalleryApiService)
    private readonly router = inject(Router)
    password = ''
    readonly busy = signal(false)
    readonly error = signal('')

    submit(): void {
        this.busy.set(true)
        this.error.set('')
        this.api.signIn(this.password).subscribe({
            next: () => this.router.navigateByUrl('/admin'),
            error: (error) => {
                this.error.set(error.error?.message ?? 'Sign-in failed. Check the password and try again.')
                this.busy.set(false)
            },
            complete: () => this.busy.set(false),
        })
    }
}
