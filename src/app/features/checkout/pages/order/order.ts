import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CheckoutService } from '../../services/checkout-api';
import { CartService } from '../../../../core/services/cart.service';

@Component({
  selector: 'app-order',
  imports: [RouterLink],
  templateUrl: './order.html',
  styleUrl: './order.css',
})
export class Order {
  private readonly router = inject(Router);
  readonly checkout = inject(CheckoutService);
  readonly cart = inject(CartService);

  get methodLabel(): string {
    const m = this.checkout.payment()?.method;
    if (m === 'credit') return 'Cartão de Crédito';
    if (m === 'boleto') return 'Boleto Bancário';
    if (m === 'pix') return 'PIX';
    return '-';
  }

  get cardMasked(): string {
    const n = this.checkout.payment()?.cardNumber ?? '';
    return n.length >= 4 ? '**** **** **** ' + n.slice(-4) : '';
  }

  onConfirm(): void {
    this.checkout.confirmOrder();
    this.cart.clear();
    this.router.navigate(['/checkout/greetings']);
  }
}
