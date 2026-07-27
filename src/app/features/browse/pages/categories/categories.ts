import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { CategoryService } from '../../../../core/services/category.service';

@Component({
  selector: 'app-categories',
  imports: [RouterLink],
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class Categories {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);

  readonly categories = computed(() => {
    const all = this.productService.list();
    return this.categoryService.list().map(c => ({
      ...c,
      count: all.filter(p => p.category === c.name).length,
    }));
  });
}
