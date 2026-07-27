import { Component, HostListener, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-account-icon',
  imports: [RouterLink],
  templateUrl: './account-icon.html',
  styleUrl: './account-icon.css',
})
export class AccountIcon {
  isOpen = false;

  constructor(private el: ElementRef, readonly auth: AuthService) {}

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  toggle(): void { this.isOpen = !this.isOpen; }
  close(): void { this.isOpen = false; }
}
