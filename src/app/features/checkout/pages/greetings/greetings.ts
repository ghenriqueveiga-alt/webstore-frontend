import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CheckoutService } from '../../services/checkout-api';
import { CartService } from '../../../../core/services/cart.service';

@Component({
  selector: 'app-greetings',
  imports: [RouterLink],
  templateUrl: './greetings.html',
  styleUrl: './greetings.css',
})
export class Greetings {
  readonly checkout = inject(CheckoutService);
  readonly cart = inject(CartService);
}
