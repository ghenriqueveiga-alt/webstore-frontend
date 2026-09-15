import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Header } from './core/components/header/header';
import { Footer } from './core/components/footer/footer';
import { CartDrawer } from './core/components/sidebar/cart/cart';
import { FavoritesService } from './core/services/favorites.service';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, CartDrawer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private router = inject(Router);

  isTvRoute = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map((e: NavigationEnd) => e.urlAfterRedirects.startsWith('/tv'))
    ),
    { initialValue: this.router.url.startsWith('/tv') }
  );

  constructor(readonly fav: FavoritesService) {}
}
