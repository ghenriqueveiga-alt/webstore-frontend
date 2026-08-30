import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadChildren: () => import('./features/browse/browse.routes') },
  { path: 'auth', loadChildren: () => import('./features/auth/auth.routes') },
  { path: 'buying', loadChildren: () => import('./features/buying/buying.routes') },
  { path: 'account', loadChildren: () => import('./features/account/account.routes') },
  { path: 'checkout', loadChildren: () => import('./features/checkout/checkout.routes') },
  { path: 'admin', loadChildren: () => import('./features/admin/admin.routes') },
  { path: 'player', loadChildren: () => import('./features/player/player.routes') },
  { path: 'tv', loadChildren: () => import('./features/tv/tv.routes') },
  { path: '**', redirectTo: 'not-found' },
];
