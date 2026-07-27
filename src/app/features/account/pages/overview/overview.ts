import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AccountService } from '../../../../core/services/account.service';

@Component({
  selector: 'app-overview',
  imports: [RouterLink, DatePipe],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class Overview {
  readonly auth = inject(AuthService);
  readonly account = inject(AccountService);
}
