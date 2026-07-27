import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../../../core/services/account.service';
import type { AddressData } from '../../../checkout/checkout.model';

@Component({
  selector: 'app-addresses',
  imports: [RouterLink, FormsModule],
  templateUrl: './addresses.html',
  styleUrl: './addresses.css',
})
export class Addresses {
  readonly account = inject(AccountService);
  readonly editingIndex = signal(-1);
  readonly showForm = signal(false);

  form = { cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' };
  readonly cepDuplicado = signal(false);

  openNew(): void {
    this.form = { cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' };
    this.editingIndex.set(-1);
    this.cepDuplicado.set(false);
    this.showForm.set(true);
  }

  openEdit(index: number): void {
    const a = this.account.addresses()[index];
    this.form = { ...a };
    this.editingIndex.set(index);
    this.showForm.set(true);
  }

  cancel(): void { this.showForm.set(false); }

  save(): void {
    const addr: AddressData = { ...this.form };
    const cepDigits = addr.cep.replace(/\D/g, '');
    if (this.editingIndex() < 0 && this.account.addresses().some(a => a.cep.replace(/\D/g, '') === cepDigits)) {
      this.cepDuplicado.set(true);
      return;
    }
    this.cepDuplicado.set(false);
    if (this.editingIndex() >= 0) {
      this.account.updateAddress(this.editingIndex(), addr);
    } else {
      this.account.addAddress(addr);
    }
    this.showForm.set(false);
  }

  remove(index: number): void {
    this.account.removeAddress(index);
  }

  maskCep(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    this.form.cep = digits.length > 5 ? digits.slice(0, 5) + '-' + digits.slice(5) : digits;
  }
}
