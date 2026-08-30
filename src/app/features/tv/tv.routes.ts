import { Routes } from '@angular/router';

export default [
  { path: '', loadComponent: () => import('./pages/programas/programas').then(m => m.Programas) },
  { path: 'grade', loadComponent: () => import('./pages/grade/grade').then(m => m.Grade) },
  { path: 'ao-vivo', loadComponent: () => import('./pages/player-ao-vivo/player-ao-vivo').then(m => m.PlayerAoVivo) },
] satisfies Routes;
