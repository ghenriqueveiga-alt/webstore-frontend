import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CheckoutService } from '../../services/checkout-api';
import { CartService } from '../../../../core/services/cart.service';
import { AccountService } from '../../../../core/services/account.service';
import type { PaymentData } from '../../checkout.model';

@Component({
  selector: 'app-payment',
  imports: [FormsModule, RouterLink],
  templateUrl: './payment.html',
  styleUrl: './payment.css',
})
export class Payment {
  private readonly router = inject(Router);
  readonly checkout = inject(CheckoutService);
  readonly cart = inject(CartService);
  readonly account = inject(AccountService);

  readonly selectedSaved = signal<number | null>(null);

  data = signal<PaymentData>({
    method: 'credit',
    cardNumber: '', cardName: '', expiry: '', cvv: '',
    installments: 1,
  });

  submitted = signal(false);

  readonly maxInstallments = [1,2,3,4,5,6,7,8,9,10,11,12];

  readonly showModal = signal(false);
  modalData = signal<PaymentData>({
    method: 'credit',
    cardNumber: '', cardName: '', expiry: '', cvv: '',
    installments: 1,
  });
  modalSubmitted = signal(false);

  constructor() {
    const cards = this.account.cards();
    if (cards.length > 0) {
      this.selectedSaved.set(0);
      this.data.update(d => ({
        ...d,
        cardNumber: cards[0].cardNumber,
        cardName: cards[0].cardName,
        expiry: cards[0].expiry,
      }));
    }
  }

  private parseBrand(n: string): string {
    if (/^4/.test(n)) return 'Visa';
    if (/^5[1-5]/.test(n)) return 'Mastercard';
    if (/^3[47]/.test(n)) return 'Amex';
    if (/^6(?:011|5)/.test(n)) return 'Discover';
    if (/^3(?:0[0-5]|[68])/.test(n)) return 'Diners';
    if (/^28|^29/.test(n)) return 'Elo';
    if (/^38|^60/.test(n)) return 'Hipercard';
    return 'Cartão';
  }

  formatCardNumber(v: string): string {
    const d = v.replace(/\D/g, '').slice(0, 16);
    return d.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  formatExpiry(v: string): string {
    const d = v.replace(/\D/g, '').slice(0, 4);
    if (d.length > 2) return d.slice(0, 2) + '/' + d.slice(2);
    return d;
  }

  onCardNumberChange(v: string): void {
    this.data.update(d => ({ ...d, cardNumber: v.replace(/\s/g, '') }));
  }

  onExpiryChange(v: string): void {
    this.data.update(d => ({ ...d, expiry: v.replace(/\D/g, '') }));
  }

  onModalCardNumberChange(v: string): void {
    this.modalData.update(d => ({ ...d, cardNumber: v.replace(/\s/g, '') }));
  }

  onModalExpiryChange(v: string): void {
    this.modalData.update(d => ({ ...d, expiry: v.replace(/\D/g, '') }));
  }

  isCardValid(d: PaymentData): boolean {
    return d.cardNumber?.length === 16
      && (d.cardName?.length ?? 0) > 0
      && (d.expiry?.length ?? 0) === 4
      && (d.cvv?.length ?? 0) >= 3;
  }

  isFormValid(): boolean {
    if (this.data().method !== 'credit') return true;
    return this.isCardValid(this.data());
  }

  isModalFormValid(): boolean {
    if (this.modalData().method !== 'credit') return true;
    return this.isCardValid(this.modalData());
  }

  setMethod(m: string): void {
    this.data.update(d => ({ ...d, method: m as 'credit' | 'boleto' | 'pix' }));
  }

  setModalMethod(m: string): void {
    this.modalData.update(d => ({ ...d, method: m as 'credit' | 'boleto' | 'pix' }));
  }

  selectSaved(index: number): void {
    this.selectedSaved.set(index);
    const card = this.account.cards()[index];
    this.data.update(d => ({
      ...d, method: 'credit',
      cardNumber: card.cardNumber,
      cardName: card.cardName,
      expiry: card.expiry,
      cvv: '',
    }));
  }

  useSelected(): void {
    if (this.selectedSaved() === null) return;
    this.checkout.setPayment(this.data());
    this.router.navigate(['/checkout/order']);
  }

  openModal(): void {
    this.modalData.set({ method: 'credit', cardNumber: '', cardName: '', expiry: '', cvv: '', installments: 1 });
    this.modalSubmitted.set(false);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  private isCardDuplicate(cardNumber: string): boolean {
    return this.account.cards().some(c =>
      c.cardNumber.replace(/\D/g, '') === cardNumber.replace(/\D/g, '')
    );
  }

  onSubmit(): void {
    this.submitted.set(true);
    if (!this.isFormValid()) return;

    if (this.data().method === 'credit') {
      const raw = (this.data().cardNumber ?? '').replace(/\D/g, '');
      if (raw && !this.isCardDuplicate(raw)) {
        this.account.addCard({
          cardNumber: raw,
          cardName: this.data().cardName ?? '',
          expiry: this.data().expiry ?? '',
          brand: this.parseBrand(raw),
        });
      }
    }

    this.checkout.setPayment(this.data());
    this.router.navigate(['/checkout/order']);
  }

  onModalSubmit(): void {
    this.modalSubmitted.set(true);
    if (!this.isModalFormValid()) return;

    const raw = (this.modalData().cardNumber ?? '').replace(/\D/g, '');
    if (!this.isCardDuplicate(raw)) {
      this.account.addCard({
        cardNumber: raw,
        cardName: this.modalData().cardName ?? '',
        expiry: this.modalData().expiry ?? '',
        brand: this.parseBrand(raw),
      });
    }

    const idx = this.account.cards().length - 1;
    this.selectedSaved.set(idx);
    const card = this.account.cards()[idx];
    this.data.update(d => ({
      ...d, method: 'credit',
      cardNumber: card.cardNumber,
      cardName: card.cardName,
      expiry: card.expiry,
      cvv: '',
    }));

    this.showModal.set(false);
    this.checkout.setPayment(this.data());
    this.router.navigate(['/checkout/order']);
  }
}
