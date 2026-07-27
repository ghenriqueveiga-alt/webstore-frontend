import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './core/components/header/header';
import { Footer } from './core/components/footer/footer';
import { CartDrawer } from './core/components/sidebar/cart/cart';
import { FavoritesService } from './core/services/favorites.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, CartDrawer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  constructor(readonly fav: FavoritesService) {}
}
