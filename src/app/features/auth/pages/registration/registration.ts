import { Component } from '@angular/core';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-registration',
  imports: [RouterLink, FormsModule],
  templateUrl: './registration.html',
  styleUrl: './registration.css',
})
export class Registration {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  acceptTerms = false;
  submitted = false;
  registerError = '';
  returnUrl = '';

  constructor(private router: Router, private route: ActivatedRoute, private auth: AuthService) {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  onSubmit(): void {
    this.submitted = true;
    this.registerError = '';
    if (!this.valid) return;
    if (this.auth.registerUser(this.email, this.password, this.name)) {
      this.router.navigateByUrl(this.returnUrl);
    } else {
      this.registerError = 'Este e-mail já está cadastrado';
    }
  }

  get valid(): boolean {
    return !!this.name && !!this.email && !!this.password && this.password === this.confirmPassword && this.acceptTerms;
  }

  get nameError(): string {
    if (!this.submitted || this.name) return '';
    return 'O nome é obrigatório';
  }

  get emailError(): string {
    if (!this.submitted || this.email) return '';
    return 'O e-mail é obrigatório';
  }

  get passwordError(): string {
    if (!this.submitted || this.password) return '';
    return 'A senha é obrigatória';
  }

  get confirmError(): string {
    if (!this.submitted) return '';
    if (!this.confirmPassword) return 'Confirme a senha';
    if (this.password !== this.confirmPassword) return 'As senhas não conferem';
    return '';
  }

  get passwordStrength(): { label: string; color: string; width: string } {
    const p = this.password;
    if (!p) return { label: '', color: 'bg-gray-200', width: 'w-0' };
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { label: 'Fraca', color: 'bg-red-500', width: 'w-1/5' };
    if (score <= 2) return { label: 'Média', color: 'bg-yellow-500', width: 'w-2/5' };
    if (score <= 3) return { label: 'Boa', color: 'bg-blue-500', width: 'w-3/5' };
    return { label: 'Forte', color: 'bg-green-500', width: 'w-full' };
  }
}
