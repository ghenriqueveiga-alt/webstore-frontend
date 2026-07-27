import { Routes } from '@angular/router';

export default [
  { path: 'cart', loadComponent: () => import('./pages/cart/cart').then(m => m.Cart) },
  { path: 'favorites', loadComponent: () => import('./pages/favorites/favorites').then(m => m.Favorites) },
] satisfies Routes;
