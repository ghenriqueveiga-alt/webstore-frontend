import { Routes } from '@angular/router';
import { authGuard } from '../../core/services/auth.guard';

export default [
  { path: 'address', loadComponent: () => import('./pages/address/address').then(m => m.Address), canActivate: [authGuard] },
  { path: 'payment', loadComponent: () => import('./pages/payment/payment').then(m => m.Payment), canActivate: [authGuard] },
  { path: 'order', loadComponent: () => import('./pages/order/order').then(m => m.Order), canActivate: [authGuard] },
  { path: 'greetings', loadComponent: () => import('./pages/greetings/greetings').then(m => m.Greetings), canActivate: [authGuard] },
] satisfies Routes;
