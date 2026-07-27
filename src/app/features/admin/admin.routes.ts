import { Routes } from '@angular/router';
import { adminGuard } from '../../core/services/admin.guard';

export default [
  {
    path: '',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/product-list/product-list').then(m => m.ProductList),
  },
  {
    path: 'categories',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/category-registration/category-registration').then(m => m.CategoryRegistration),
  },
] as Routes;
