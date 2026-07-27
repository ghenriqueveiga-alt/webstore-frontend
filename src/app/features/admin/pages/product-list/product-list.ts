import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService, ProductFull } from '../../../../core/services/product.service';
import { CategoryService } from '../../../../core/services/category.service';

type SortColumn = 'name' | 'category' | 'price' | 'rating';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-product-list',
  imports: [RouterLink, FormsModule],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  readonly products = this.productService.list;
  readonly categories = computed(() => this.categoryService.list());

  sortColumn = signal<SortColumn>('name');
  sortDir = signal<SortDir>('asc');

  readonly sortedProducts = computed(() => {
    const col = this.sortColumn();
    const dir = this.sortDir();
    const list = [...this.products()];
    list.sort((a, b) => {
      let cmp = 0;
      if (col === 'price' || col === 'rating') {
        cmp = a[col] - b[col];
      } else {
        cmp = a[col].localeCompare(b[col], 'pt-BR');
      }
      return dir === 'asc' ? cmp : -cmp;
    });
    return list;
  });

  toggleSort(col: SortColumn): void {
    if (this.sortColumn() === col) {
      this.sortDir.update(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(col);
      this.sortDir.set('asc');
    }
  }

  sortArrow(col: SortColumn): string {
    if (this.sortColumn() !== col) return '↕';
    return this.sortDir() === 'asc' ? '▲' : '▼';
  }

  showModal = signal(false);
  editingProduct: ProductFull | null = null;
  submitted = false;
  success = false;
  deleteConfirm: number | null = null;

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

  openNew(): void {
    this.editingProduct = null;
    this.submitted = false;
    this.form.set({ name: '', price: 0, originalPrice: 0, image: '', category: '', rating: 5, reviews: 0, description: '', badge: '' });
    this.specs.set([]);
    this.showModal.set(true);
  }

  openEdit(product: ProductFull): void {
    this.editingProduct = product;
    this.submitted = false;
    this.form.set({
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice ?? 0,
      image: product.image,
      category: product.category,
      rating: product.rating,
      reviews: product.reviews,
      description: product.description,
      badge: product.badge ?? '',
    });
    this.specs.set([...product.specs]);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingProduct = null;
    this.submitted = false;
  }

  onSubmit(): void {
    this.submitted = true;
    this.success = false;
    if (!this.valid) return;

    const f = this.form();
    const product: ProductFull = {
      id: this.editingProduct ? this.editingProduct.id : this.productService.list().reduce((m, p) => Math.max(m, p.id), 0) + 1,
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

    if (this.editingProduct) {
      this.productService.update(product);
    } else {
      this.productService.add(product);
    }

    this.success = true;
    this.submitted = false;
    this.form.set({ name: '', price: 0, originalPrice: 0, image: '', category: '', rating: 5, reviews: 0, description: '', badge: '' });
    this.specs.set([]);
    this.editingProduct = null;
  }

  confirmDelete(id: number): void {
    this.deleteConfirm = id;
  }

  cancelDelete(): void {
    this.deleteConfirm = null;
  }

  deleteProduct(id: number): void {
    this.productService.remove(id);
    this.deleteConfirm = null;
  }

  fmt(v: number): string {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  }
}
