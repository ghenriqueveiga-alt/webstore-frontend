import { Routes } from '@angular/router';
import { authGuard } from '../../core/services/auth.guard';

export default [
  { path: '', loadComponent: () => import('./pages/overview/overview').then(m => m.Overview), canActivate: [authGuard] },
  { path: 'orders', loadComponent: () => import('./pages/orders/orders').then(m => m.Orders), canActivate: [authGuard] },
  { path: 'orders/:id', loadComponent: () => import('./pages/order-detail/order-detail').then(m => m.OrderDetail), canActivate: [authGuard] },
  { path: 'addresses', loadComponent: () => import('./pages/addresses/addresses').then(m => m.Addresses), canActivate: [authGuard] },
  { path: 'payments', loadComponent: () => import('./pages/payments/payments').then(m => m.Payments), canActivate: [authGuard] },
  { path: 'settings', loadComponent: () => import('./pages/costumer-settings/costumer-settings').then(m => m.CostumerSettings), canActivate: [authGuard] },
] satisfies Routes;
