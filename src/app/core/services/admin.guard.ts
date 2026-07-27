import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdmin()) return true;
  if (auth.isAuthenticated()) return router.parseUrl('/');
  return router.parseUrl('/auth/login?returnUrl=' + encodeURIComponent(state.url));
};
