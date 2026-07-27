import { Component, HostListener, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '../../../services/favorites.service';
import { CartService } from '../../../services/cart.service';

@Component({
  selector: 'app-favorites-icon',
  imports: [RouterLink],
  templateUrl: './favorites-icon.html',
  styleUrl: './favorites-icon.css',
})
export class FavoritesIcon {
  constructor(readonly fav: FavoritesService, readonly cart: CartService, private el: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.fav.closeDrawer();
    }
  }
}
