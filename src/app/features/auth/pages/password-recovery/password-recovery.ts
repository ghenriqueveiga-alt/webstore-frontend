import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-password-recovery',
  imports: [RouterLink, FormsModule],
  templateUrl: './password-recovery.html',
  styleUrl: './password-recovery.css',
})
export class PasswordRecovery {
  email = '';
  submitted = false;
  sent = signal(false);

  onSubmit(): void {
    this.submitted = true;
    if (!this.email) return;
    this.sent.set(true);
  }

  get emailError(): string {
    if (!this.submitted || this.email) return '';
    return 'Informe seu e-mail cadastrado';
  }
}
