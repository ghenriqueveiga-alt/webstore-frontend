import { Component } from '@angular/core';
import { CartService } from '../../../services/cart.service';

@Component({
  selector: 'app-cart-icon',
  imports: [],
  templateUrl: './cart-icon.html',
  styleUrl: './cart-icon.css',
})
export class CartIcon {
  constructor(readonly cart: CartService) {}
}
