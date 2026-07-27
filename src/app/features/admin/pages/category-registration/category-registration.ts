import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../../../core/services/category.service';
import { ProductService } from '../../../../core/services/product.service';

@Component({
  selector: 'app-category-registration',
  imports: [RouterLink, FormsModule],
  templateUrl: './category-registration.html',
  styleUrl: './category-registration.css',
})
export class CategoryRegistration {
  private categoryService = inject(CategoryService);
  private productService = inject(ProductService);

  readonly categories = this.categoryService.list;

  readonly productCounts = computed(() => {
    const map: Record<string, number> = {};
    for (const cat of this.categories()) {
      map[cat.name] = this.productService.countByCategory(cat.name);
    }
    return map;
  });

  submitted = false;
  success = false;
  newName = '';
  newIcon = '';
  catToRemove: number | null = null;

  addCategory(): void {
    this.submitted = true;
    this.success = false;
    if (!this.newName || !this.newIcon) return;
    this.categoryService.add(this.newName, this.newIcon);
    this.newName = '';
    this.newIcon = '';
    this.submitted = false;
    this.success = true;
  }

  confirmRemove(id: number): void {
    this.catToRemove = id;
  }

  cancelRemove(): void {
    this.catToRemove = null;
  }

  removeCategory(id: number): void {
    const cat = this.categoryService.getById(id);
    if (!cat || this.productService.countByCategory(cat.name) > 0) return;
    this.categoryService.remove(id);
    this.catToRemove = null;
  }
}
