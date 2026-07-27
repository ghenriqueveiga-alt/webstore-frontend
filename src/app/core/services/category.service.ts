import { Injectable, signal, computed } from '@angular/core';

export interface Category {
  id: number;
  name: string;
  icon: string;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  readonly list = signal<Category[]>([
    { id: 1, name: 'Eletrônicos', icon: '📱' },
    { id: 2, name: 'Moda', icon: '👕' },
    { id: 3, name: 'Casa & Decoração', icon: '🏠' },
    { id: 4, name: 'Esportes', icon: '⚽' },
    { id: 5, name: 'Livros', icon: '📚' },
    { id: 6, name: 'Jogos', icon: '🎮' },
    { id: 7, name: 'Beleza', icon: '💄' },
    { id: 8, name: 'Alimentos & Bebidas', icon: '🍷' },
    { id: 9, name: 'Automotivo', icon: '🚗' },
    { id: 10, name: 'Brinquedos', icon: '🧸' },
    { id: 11, name: 'Ferramentas', icon: '🔧' },
    { id: 12, name: 'Música', icon: '🎵' },
    { id: 13, name: 'Papelaria', icon: '📎' },
    { id: 14, name: 'Pets', icon: '🐾' },
  ]);

  private nextId = signal(15);

  add(name: string, icon: string): Category {
    const id = this.nextId();
    this.nextId.update(v => v + 1);
    const cat: Category = { id, name, icon };
    this.list.update(list => [...list, cat]);
    return cat;
  }

  remove(id: number): void {
    this.list.update(list => list.filter(c => c.id !== id));
  }

  getById(id: number): Category | undefined {
    return this.list().find(c => c.id === id);
  }

  getNameMap(): Record<string, number> {
    const map: Record<string, number> = {};
    for (const c of this.list()) map[c.name] = c.id;
    return map;
  }
}
