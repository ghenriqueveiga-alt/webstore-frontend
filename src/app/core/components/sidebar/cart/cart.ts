import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../services/cart.service';

@Component({
  selector: 'app-cart-drawer',
  imports: [RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class CartDrawer {
  constructor(readonly cart: CartService) {}
}
