import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LinhaVermelhaService {

  readonly slot = signal<string | null>(null);
  readonly pagina = signal(0);
  readonly diaIdx = signal<number | null>(null);

  definir(slot: string, pagina: number, diaIdx: number): void {
    this.slot.set(slot);
    this.pagina.set(pagina);
    this.diaIdx.set(diaIdx);
  }

  acompanharPagina(pagina: number): void {
    this.pagina.set(pagina);
  }

  limpar(): void {
    this.slot.set(null);
    this.pagina.set(0);
    this.diaIdx.set(null);
  }
}
