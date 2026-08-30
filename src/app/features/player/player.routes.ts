import { Routes } from '@angular/router';

export default [
  { path: '', loadComponent: () => import('./pages/player/player').then(m => m.Player) },
] satisfies Routes;
