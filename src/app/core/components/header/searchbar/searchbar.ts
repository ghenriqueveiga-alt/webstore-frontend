import { Component, HostListener, ElementRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { SearchService } from '../../../services/search.service';

@Component({
  selector: 'app-searchbar',
  imports: [RouterLink],
  templateUrl: './searchbar.html',
  styleUrl: './searchbar.css',
})
export class Searchbar {
  constructor(readonly search: SearchService, private router: Router, private el: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.search.closeDropdown();
    }
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.search.search(value);
  }

  onSubmit(): void {
    const q = this.search.query().trim();
    if (q) {
      this.search.closeDropdown();
      this.router.navigate(['/search'], { queryParams: { q } });
    }
  }

  onSelect(): void {
    this.search.clear();
  }
}
