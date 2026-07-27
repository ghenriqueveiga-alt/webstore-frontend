import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '../../../../core/services/favorites.service';
import { CartService } from '../../../../core/services/cart.service';

@Component({
  selector: 'app-favorites',
  imports: [RouterLink],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css',
})
export class Favorites {
  constructor(readonly fav: FavoritesService, readonly cart: CartService) {}
}
