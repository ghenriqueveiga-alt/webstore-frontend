import { computed, Injectable, signal, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export interface FavoriteItem {
  id: number;
  name: string;
  price: number;
  image: string;
}

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  readonly items = signal<FavoriteItem[]>([]);
  readonly isDrawerOpen = signal(false);
  readonly count = computed(() => this.items().length);
  readonly showAuthModal = signal(false);

  private router = inject(Router);

  constructor(private auth: AuthService) {
    effect(() => {
      if (!this.auth.isAuthenticated()) {
        this.items.set([]);
      }
    });
  }

  toggleDrawer(): void { this.isDrawerOpen.update(v => !v); }
  openDrawer(): void { this.isDrawerOpen.set(true); }
  closeDrawer(): void { this.isDrawerOpen.set(false); }

  isFavorite(id: number): boolean {
    return this.items().some(i => i.id === id);
  }

  toggle(item: FavoriteItem): void {
    if (!this.auth.isAuthenticated()) {
      this.showAuthModal.set(true);
      return;
    }
    if (this.isFavorite(item.id)) {
      this.remove(item.id);
    } else {
      this.add(item);
    }
  }

  closeAuthModal(): void { this.showAuthModal.set(false); }

  goLogin(): void {
    this.showAuthModal.set(false);
    this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
  }

  goRegister(): void {
    this.showAuthModal.set(false);
    this.router.navigate(['/auth/registration'], { queryParams: { returnUrl: this.router.url } });
  }

  private add(item: FavoriteItem): void {
    this.items.update(list => [...list, item]);
  }

  remove(id: number): void {
    this.items.update(list => list.filter(i => i.id !== id));
  }

  clear(): void {
    this.items.set([]);
  }
}
