import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../../../core/services/account.service';

@Component({
  selector: 'app-payments',
  imports: [RouterLink, FormsModule],
  templateUrl: './payments.html',
  styleUrl: './payments.css',
})
export class Payments {
  readonly account = inject(AccountService);
  readonly showForm = signal(false);

  cardNumber = '';
  cardName = '';
  expiry = '';
  cvv = '';

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

  openNew(): void {
    this.cardNumber = '';
    this.cardName = '';
    this.expiry = '';
    this.cvv = '';
    this.showForm.set(true);
  }

  cancel(): void { this.showForm.set(false); }

  save(): void {
    if (!this.cardNumber || !this.cardName || !this.expiry) return;
    this.account.addCard({
      cardNumber: this.cardNumber.replace(/\s/g, ''),
      cardName: this.cardName,
      expiry: this.expiry,
      brand: this.parseBrand(this.cardNumber),
    });
    this.showForm.set(false);
  }

  remove(id: number): void {
    this.account.removeCard(id);
  }

  maskCardNumber(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    this.cardNumber = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  maskExpiry(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    this.expiry = digits.length > 2 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits;
  }

  maskCvv(value: string): void {
    this.cvv = value.replace(/\D/g, '').slice(0, 4);
  }
}
