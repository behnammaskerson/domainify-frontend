import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Blocks authenticated users from guest-only pages.
 * Optional route data: { guestRedirectTo: '/tickets/mine' }
 */
@Injectable({
  providedIn: 'root'
})
export class GuestGuard implements CanActivate {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    if (this.authService.isLoggedIn()) {
      const redirectTo = (route.data['guestRedirectTo'] as string | undefined) || '/dashboard';
      return this.router.createUrlTree([redirectTo]);
    }
    return true;
  }
}
