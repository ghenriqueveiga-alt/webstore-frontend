import { computed, Injectable, signal, inject } from '@angular/core';
import { CartService } from '../../../core/services/cart.service';
import { AccountService } from '../../../core/services/account.service';
import type { AddressData, PaymentData } from '../checkout.model';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private cart = inject(CartService);
  private account = inject(AccountService);

  readonly step = signal(1);
  readonly address = signal<AddressData | null>(null);
  readonly payment = signal<PaymentData | null>(null);
  readonly orderNumber = signal(`#WS-${Date.now().toString(36).toUpperCase()}`);

  readonly isAddressValid = signal(false);
  readonly isPaymentValid = signal(false);

  setAddress(a: AddressData): void {
    this.address.set(a);
    this.isAddressValid.set(true);
    this.step.set(2);
  }

  setPayment(p: PaymentData): void {
    this.payment.set(p);
    this.isPaymentValid.set(true);
    this.step.set(3);
  }

  confirmOrder(): void {
    const addr = this.address();
    const pmt = this.payment();
    if (!addr || !pmt) return;

    this.account.addOrder({
      orderNumber: this.orderNumber(),
      date: new Date(),
      items: this.cart.items().map(i => ({ name: i.name, quantity: i.quantity, price: i.price, image: i.image })),
      total: this.cart.total(),
      address: addr,
      payment: {
        method: pmt.method,
        lastDigits: pmt.cardNumber?.slice(-4),
      },
      status: 'confirmed',
    });

    this.step.set(4);
  }

  reset(): void {
    this.step.set(1);
    this.address.set(null);
    this.payment.set(null);
    this.isAddressValid.set(false);
    this.isPaymentValid.set(false);
    this.orderNumber.set(`#WS-${Date.now().toString(36).toUpperCase()}`);
  }
}
