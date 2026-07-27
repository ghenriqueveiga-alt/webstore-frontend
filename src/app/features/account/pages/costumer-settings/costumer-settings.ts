import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-costumer-settings',
  imports: [RouterLink],
  templateUrl: './costumer-settings.html',
  styleUrl: './costumer-settings.css',
})
export class CostumerSettings {
  readonly auth = inject(AuthService);
}
