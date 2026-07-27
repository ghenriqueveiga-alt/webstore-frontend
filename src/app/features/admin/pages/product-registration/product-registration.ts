import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService, ProductFull } from '../../../../core/services/product.service';
import { CategoryService } from '../../../../core/services/category.service';

@Component({
  selector: 'app-product-registration',
  imports: [RouterLink, FormsModule],
  templateUrl: './product-registration.html',
  styleUrl: './product-registration.css',
})
export class ProductRegistration {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  readonly categories = computed(() => this.categoryService.list());

  submitted = false;
  success = false;

  form = signal({
    name: '',
    price: 0,
    originalPrice: 0,
    image: '',
    category: '',
    rating: 5,
    reviews: 0,
    description: '',
    badge: '',
  });

  specs = signal<{ label: string; value: string }[]>([]);
  newSpecLabel = '';
  newSpecValue = '';

  addSpec(): void {
    if (!this.newSpecLabel || !this.newSpecValue) return;
    this.specs.update(list => [...list, { label: this.newSpecLabel, value: this.newSpecValue }]);
    this.newSpecLabel = '';
    this.newSpecValue = '';
  }

  removeSpec(index: number): void {
    this.specs.update(list => list.filter((_, i) => i !== index));
  }

  get valid(): boolean {
    const f = this.form();
    return !!f.name && f.price > 0 && !!f.image && !!f.category && !!f.description;
  }

  onSubmit(): void {
    this.submitted = true;
    this.success = false;
    if (!this.valid) return;

    const f = this.form();
    const all = this.productService.list();
    const maxId = all.reduce((m, p) => Math.max(m, p.id), 0);

    const product: ProductFull = {
      id: maxId + 1,
      name: f.name,
      price: f.price,
      originalPrice: f.originalPrice > 0 ? f.originalPrice : undefined,
      image: f.image || '📦',
      category: f.category,
      rating: f.rating,
      reviews: f.reviews,
      description: f.description,
      specs: this.specs(),
      badge: f.badge || undefined,
    };

    this.productService.add(product);
    this.success = true;
    this.submitted = false;
    this.form.set({ name: '', price: 0, originalPrice: 0, image: '', category: '', rating: 5, reviews: 0, description: '', badge: '' });
    this.specs.set([]);
  }
}
