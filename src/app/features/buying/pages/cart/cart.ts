import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../../../core/services/cart.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-cart',
  imports: [RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart {
  readonly cart = inject(CartService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly showAuthModal = signal(false);

  onCheckout(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/checkout/address']);
    } else {
      this.showAuthModal.set(true);
    }
  }

  goLogin(): void {
    this.showAuthModal.set(false);
    this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/checkout/address' } });
  }

  goRegister(): void {
    this.showAuthModal.set(false);
    this.router.navigate(['/auth/registration'], { queryParams: { returnUrl: '/checkout/address' } });
  }

  closeModal(): void {
    this.showAuthModal.set(false);
  }
}
