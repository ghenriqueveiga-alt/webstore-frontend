import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LinhaVermelhaService {

  readonly slot = signal<string | null>(null);
  readonly pagina = signal(0);
  readonly diaIdx = signal<number | null>(null);
  readonly desde = signal(0);

  constructor() {
    effect(() => this._persistir(), { allowSignalWrites: false });
    this._recuperar();
  }

  private _chave(): string {
    return `linha-vermelha-${document.title || 'webstore'}`;
  }

  private _persistir(): void {
    try {
      const data = {
        slot: this.slot(),
        pagina: this.pagina(),
        diaIdx: this.diaIdx(),
        desde: this.desde(),
      };
      localStorage.setItem(this._chave(), JSON.stringify(data));
    } catch { }
  }

  private _recuperar(): void {
    try {
      const data = localStorage.getItem(this._chave());
      if (!data) return;
      const parsed = JSON.parse(data);
      this.slot.set(parsed.slot ?? null);
      this.pagina.set(parsed.pagina ?? 0);
      this.diaIdx.set(parsed.diaIdx ?? null);
      this.desde.set(parsed.desde ?? 0);
    } catch { }
  }

  definir(slot: string, pagina: number, diaIdx: number): void {
    this.slot.set(slot);
    this.pagina.set(pagina);
    this.diaIdx.set(diaIdx);
    this.desde.set(Date.now());
  }

  acompanharPagina(pagina: number): void {
    this.pagina.set(pagina);
  }

  limpar(): void {
    this.slot.set(null);
    this.pagina.set(0);
    this.diaIdx.set(null);
    this.desde.set(0);
    try { localStorage.removeItem(this._chave()); } catch { }
  }

  resetarSeNecessario(): void {
    // Se slot vazio há mais de 5 minutos, limpa
    if (this.slot() && Date.now() - this.desde() > 5 * 60 * 1000) {
      this.limpar();
    }
  }

  // Nova função: retorna a fração do bloco atual (0 a 1)
  // Ex: 21:43 -> (43%30)/30 = 13/30 ≈ 0.433 (13 minutos do bloco)
  fracaoBloco(): number {
    if (this.slot()) return 0;
    const now = new Date();
    const minutos = now.getMinutes();
    return (minutos % 30) / 30;
  }

  // Nova função: retorna o tempo em segundos dentro do bloco atual
  // Ex: 21:43 -> 13 * 60 = 780 segundos dentro do bloco
  segundosDentroBloco(): number {
    if (this.slot()) return 0;
    const now = new Date();
    return (now.getMinutes() % 30) * 60;
  }
}