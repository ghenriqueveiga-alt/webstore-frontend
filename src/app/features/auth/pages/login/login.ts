import { Component } from '@angular/core';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  login = '';
  password = '';
  remember = false;
  submitted = false;
  loginError = false;
  returnUrl = '';

  constructor(private router: Router, private route: ActivatedRoute, private auth: AuthService) {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  onSubmit(): void {
    this.submitted = true;
    this.loginError = false;
    if (!this.login || !this.password) return;
    if (this.auth.login(this.login, this.password)) {
      this.router.navigateByUrl(this.returnUrl);
    } else {
      this.loginError = true;
    }
  }

  get loginFieldError(): string {
    if (!this.submitted || this.login) return '';
    return 'O login é obrigatório';
  }

  get passwordError(): string {
    if (!this.submitted || this.password) return '';
    return 'A senha é obrigatória';
  }
}
