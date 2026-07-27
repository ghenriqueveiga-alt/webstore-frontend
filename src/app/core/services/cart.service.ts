import { computed, Injectable, signal } from '@angular/core';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  readonly items = signal<CartItem[]>([]);
  readonly isDrawerOpen = signal(false);

  toggleDrawer(): void { this.isDrawerOpen.update(v => !v); }
  openDrawer(): void { this.isDrawerOpen.set(true); }
  closeDrawer(): void { this.isDrawerOpen.set(false); }

  readonly count = computed(() => this.items().reduce((acc, item) => acc + item.quantity, 0));
  readonly subtotal = computed(() => this.items().reduce((acc, item) => acc + item.price * item.quantity, 0));
  readonly shipping = computed(() => (this.subtotal() >= 199 ? 0 : 19.9));
  readonly total = computed(() => this.subtotal() + this.shipping());

  add(item: CartItem): void {
    this.items.update(list => {
      const existing = list.find(i => i.id === item.id);
      if (existing) {
        return list.map(i => i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i);
      }
      return [...list, item];
    });
  }

  remove(id: number): void {
    this.items.update(list => list.filter(i => i.id !== id));
  }

  updateQuantity(id: number, quantity: number): void {
    if (quantity <= 0) { this.remove(id); return; }
    this.items.update(list => list.map(i => i.id === id ? { ...i, quantity } : i));
  }

  clear(): void {
    this.items.set([]);
  }
}
