import { Routes } from '@angular/router';

export default [
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.Login) },
  { path: 'registration', loadComponent: () => import('./pages/registration/registration').then(m => m.Registration) },
  { path: 'password-recovery', loadComponent: () => import('./pages/password-recovery/password-recovery').then(m => m.PasswordRecovery) },
  { path: 'access-denied', loadComponent: () => import('./pages/access-denied/access-denied').then(m => m.AccessDenied) },
] satisfies Routes;
