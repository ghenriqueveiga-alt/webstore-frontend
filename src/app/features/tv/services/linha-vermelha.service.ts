import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LinhaVermelhaService {

  readonly slot = signal<string | null>(null);
  readonly pagina = signal(0);

  definir(slot: string, pagina: number): void {
    this.slot.set(slot);
    this.pagina.set(pagina);
  }

  acompanharPagina(pagina: number): void {
    this.pagina.set(pagina);
  }

  limpar(): void {
    this.slot.set(null);
    this.pagina.set(0);
  }
}
