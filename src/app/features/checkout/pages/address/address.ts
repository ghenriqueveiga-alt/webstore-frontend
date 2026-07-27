import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CheckoutService } from '../../services/checkout-api';
import { AccountService } from '../../../../core/services/account.service';
import { CartService } from '../../../../core/services/cart.service';
import { CepService } from '../../../../core/services/cep.service';
import type { AddressData } from '../../checkout.model';

const BRAZIL_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

@Component({
  selector: 'app-address',
  imports: [FormsModule, RouterLink],
  templateUrl: './address.html',
  styleUrl: './address.css',
})
export class Address {
  private readonly router = inject(Router);
  readonly checkout = inject(CheckoutService);
  readonly account = inject(AccountService);
  readonly cart = inject(CartService);
  private readonly cepService = inject(CepService);

  readonly states = BRAZIL_STATES;

  readonly selectedSaved = signal<number | null>(null);
  readonly showModal = signal(false);

  data = signal<AddressData>({
    cep: '', street: '', number: '', complement: '',
    neighborhood: '', city: '', state: '',
  });

  modalData = signal<AddressData>({
    cep: '', street: '', number: '', complement: '',
    neighborhood: '', city: '', state: '',
  });

  submitted = signal(false);
  modalSubmitted = signal(false);

  readonly cepError = signal(false);
  readonly cepLoading = signal(false);
  readonly modalCepError = signal(false);
  readonly modalCepLoading = signal(false);

  constructor() {
    const addrs = this.account.addresses();
    if (addrs.length > 0) {
      this.selectedSaved.set(0);
      this.data.set(addrs[0]);
    }
  }

  readonly isFormValid = () => {
    const d = this.data();
    return !this.cepError() && d.cep.length >= 8 && d.street.length > 0 && d.number.length > 0
      && d.neighborhood.length > 0 && d.city.length > 0 && d.state.length > 0;
  };

  readonly isModalFormValid = () => {
    const d = this.modalData();
    return !this.modalCepError() && d.cep.length >= 8 && d.street.length > 0 && d.number.length > 0
      && d.neighborhood.length > 0 && d.city.length > 0 && d.state.length > 0;
  };

  selectSaved(index: number): void {
    this.selectedSaved.set(index);
    this.data.set(this.account.addresses()[index]);
  }

  useSelected(): void {
    const i = this.selectedSaved();
    if (i === null || i < 0) return;
    this.checkout.setAddress(this.account.addresses()[i]);
    this.router.navigate(['/checkout/payment']);
  }

  openModal(): void {
    this.modalData.set({ cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' });
    this.modalSubmitted.set(false);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  onModalSubmit(): void {
    this.modalSubmitted.set(true);
    if (!this.isModalFormValid()) return;
    const addr = this.modalData();
    const cepDigits = addr.cep.replace(/\D/g, '');
    if (this.account.addresses().some(a => a.cep.replace(/\D/g, '') === cepDigits)) return;
    this.account.addAddress(addr);
    this.selectedSaved.set(this.account.addresses().length - 1);
    this.data.set(addr);
    this.showModal.set(false);
    this.checkout.setAddress(addr);
    this.router.navigate(['/checkout/payment']);
  }

  isCepDuplicate(cep: string): boolean {
    return this.account.addresses().some(a => a.cep.replace(/\D/g, '') === cep.replace(/\D/g, ''));
  }

  private preencherEndereco(d: AddressData, response: any): AddressData {
    return {
      ...d,
      street: response.logradouro || d.street,
      neighborhood: response.bairro || d.neighborhood,
      city: response.localidade || d.city,
      state: response.uf || d.state,
    };
  }

  maskCep(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const masked = digits.length > 5 ? digits.slice(0, 5) + '-' + digits.slice(5) : digits;
    this.data.set({...this.data(), cep: masked});
    this.cepError.set(false);
    if (digits.length === 8) {
      this.cepLoading.set(true);
      this.cepService.buscar(digits).subscribe({
        next: res => {
          if (res.erro) {
            this.cepError.set(true);
          } else {
            this.data.update(d => this.preencherEndereco(d, res));
          }
          this.cepLoading.set(false);
        },
        error: () => this.cepLoading.set(false),
      });
    }
  }

  maskCepModal(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const masked = digits.length > 5 ? digits.slice(0, 5) + '-' + digits.slice(5) : digits;
    this.modalData.set({...this.modalData(), cep: masked});
    this.modalCepError.set(false);
    if (digits.length === 8) {
      this.modalCepLoading.set(true);
      this.cepService.buscar(digits).subscribe({
        next: res => {
          if (res.erro) {
            this.modalCepError.set(true);
          } else {
            this.modalData.update(d => this.preencherEndereco(d, res));
          }
          this.modalCepLoading.set(false);
        },
        error: () => this.modalCepLoading.set(false),
      });
    }
  }

  onSubmit(): void {
    this.submitted.set(true);
    if (!this.isFormValid()) return;
    this.account.addAddress(this.data());
    this.checkout.setAddress(this.data());
    this.router.navigate(['/checkout/payment']);
  }
}
