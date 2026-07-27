import { Routes } from '@angular/router';

export default [
  { path: '', loadComponent: () => import('./pages/home/home').then(m => m.Home) },
  { path: 'about', loadComponent: () => import('./pages/about/about').then(m => m.About) },
  { path: 'categories', loadComponent: () => import('./pages/categories/categories').then(m => m.Categories) },
  { path: 'category/:id', loadComponent: () => import('./pages/category/category').then(m => m.Category) },
  { path: 'search', loadComponent: () => import('./pages/search/search').then(m => m.Search) },
  { path: 'products', loadComponent: () => import('./pages/products/products').then(m => m.Products) },
  { path: 'product/:id', loadComponent: () => import('./pages/product/product').then(m => m.Product) },
  { path: 'not-found', loadComponent: () => import('./pages/not-found/not-found').then(m => m.NotFound) },
] satisfies Routes;
