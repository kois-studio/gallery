import { Routes } from '@angular/router'
import { AdminComponent } from './admin/admin.component'
import { LoginComponent } from './auth/login.component'
import { SetupComponent } from './auth/setup.component'
import { SharedGalleryComponent } from './visitor/shared-gallery.component'

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'setup', component: SetupComponent },
    { path: 'admin', component: AdminComponent },
    { path: 'g/:slug/:token', component: SharedGalleryComponent },
    { path: 'shared/:slug', component: SharedGalleryComponent },
    { path: '**', redirectTo: 'login' },
]
