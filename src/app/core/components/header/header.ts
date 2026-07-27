import { Component } from '@angular/core';
import { Logo } from './logo/logo';
import { Menu } from './menu/menu';
import { Searchbar } from './searchbar/searchbar';
import { AccountIcon } from './account-icon/account-icon';
import { FavoritesIcon } from './favorites-icon/favorites-icon';
import { CartIcon } from './cart-icon/cart-icon';

@Component({
  selector: 'app-header',
  imports: [Logo, Menu, Searchbar, AccountIcon, FavoritesIcon, CartIcon],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
}
