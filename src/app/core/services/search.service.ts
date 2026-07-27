import { computed, Injectable, signal, inject } from '@angular/core';
import { ProductService } from './product.service';

export interface SearchProduct {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private productService = inject(ProductService);

  readonly query = signal('');
  readonly isDropdownOpen = signal(false);

  readonly allProducts = computed(() => this.productService.list().map(p => ({
    id: p.id, name: p.name, price: p.price, image: p.image, category: p.category,
  })));

  readonly results = computed(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return [] as SearchProduct[];
    return this.allProducts().filter(p =>
      p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  });

  search(q: string): void {
    this.query.set(q);
    this.isDropdownOpen.set(q.length > 0);
  }

  closeDropdown(): void { this.isDropdownOpen.set(false); }
  clear(): void { this.query.set(''); this.isDropdownOpen.set(false); }
}
