import { Component, computed, HostListener, ElementRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../../services/product.service';
import { CategoryService } from '../../../services/category.service';

@Component({
  selector: 'app-menu',
  imports: [RouterLink],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  isOpen = false;

  readonly categories = computed(() => {
    const all = this.productService.list();
    return this.categoryService.list().map(c => ({
      ...c,
      count: all.filter(p => p.category === c.name).length,
    }));
  });

  constructor(private el: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  toggle(): void { this.isOpen = !this.isOpen; }
  close(): void { this.isOpen = false; }
}
