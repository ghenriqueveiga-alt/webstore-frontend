import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NgClass } from '@angular/common';
import { TvService, BlocoOutput, GradeOutput } from '../../services/tv.service';

interface EpisodioInfo {
  aId: number;
  aNumero: number | null;
  aTemporada: number | null;
  aParte: number | null;
  aTitulo: string | null;
  aDuracao: string | null;
}

@Component({
  selector: 'app-grade-diaria',
  imports: [RouterLink, NgClass],
  templateUrl: './grade-diaria.html',
  styleUrl: './grade-diaria.css',
})
export class GradeDiaria implements OnInit, OnDestroy {

  readonly tvService = inject(TvService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  readonly blocos = signal<BlocoOutput[]>([]);
  readonly loading = signal(true);
  readonly selectedDay = signal(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  readonly currentTime = signal(new Date());

  readonly dias = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
  readonly diasIcons = ['📅', '📅', '📅', '📅', '📅', '🎉', '🎉'];

  readonly allEpisodiosMap = new Map<number, EpisodioInfo[]>();
  readonly episodioCache = new Map<number, EpisodioInfo | null>();

  private _timerInterval: any;

  ngOnInit(): void {
    this._timerInterval = setInterval(() => this.currentTime.set(new Date()), 30000);
    this.tvService.listBlocos(0, 400).subscribe({
      next: (res) => {
        this.blocos.set(res.aBlocos);
        this.loadEpisodios(res.aBlocos);
      },
      error: () => {
        this.blocos.set([]);
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    if (this._timerInterval) clearInterval(this._timerInterval);
  }

  get filteredBlocos(): BlocoOutput[] {
    const dia = this.dias[this.selectedDay()];
    return this.blocos()
      .filter(b => b.aStatusCode === 'AT' && this.normalizeDia(b.aDiaSemanaDesc ?? '') === this.normalizeDia(dia))
      .sort((a, b) => (a.aHorario ?? '').localeCompare(b.aHorario ?? ''));
  }

  private loadEpisodios(blocos: BlocoOutput[]): void {
    const programIds = [...new Set(blocos.filter(b => b.aPrograma).map(b => b.aPrograma!.aId))];
    if (programIds.length === 0) {
      this.loading.set(false);
      return;
    }

    this.tvService.listPrimeirosEpisodiosPorPrograma(programIds, 10000).subscribe({
      next: (rows) => {
        this.allEpisodiosMap.clear();
        const grouped = new Map<number, EpisodioInfo[]>();
        for (const row of rows) {
          const pid = row.aProgramaId;
          if (!grouped.has(pid)) grouped.set(pid, []);
          grouped.get(pid)!.push({
            aId: row.aId,
            aNumero: row.aNumero,
            aTemporada: row.aTemporada,
            aParte: row.aParte,
            aTitulo: row.aTitulo,
            aDuracao: (row as any).aDuracao ?? null,
          });
        }
        for (const [pid, eps] of grouped) {
          eps.sort((a, b) => ((a.aTemporada ?? 0) - (b.aTemporada ?? 0)) || ((a.aParte ?? 0) - (b.aParte ?? 0)) || ((a.aNumero ?? 0) - (b.aNumero ?? 0)));
          this.allEpisodiosMap.set(pid, eps);
        }
        this.rebuildCache();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private rebuildCache(): void {
    this.episodioCache.clear();
    for (const b of this.filteredBlocos) {
      this.episodioCache.set(b.aId, this.getEpisodio(b));
    }
  }

  getEpisodio(bloco: BlocoOutput): EpisodioInfo | null {
    const cached = this.episodioCache.get(bloco.aId);
    if (cached !== undefined) return cached;

    if (!bloco.aPrograma) return null;
    const eps = this.allEpisodiosMap.get(bloco.aPrograma.aId);
    if (!eps || eps.length === 0) return null;

    const diaSemana = bloco.aDiaSemanaDesc ?? '';
    const diaIdx = this.dias.indexOf(diaSemana);
    if (diaIdx < 0) return null;

    const diasQuePassa = [...new Set(
      this.blocos()
        .filter(b => b.aPrograma?.aId === bloco.aPrograma!.aId && b.aDiaSemanaDesc)
        .map(b => this.dias.indexOf(b.aDiaSemanaDesc!))
    )].filter(d => d >= 0).sort((a, b) => a - b);

    const dayPosition = diasQuePassa.indexOf(diaIdx);
    if (dayPosition < 0) return null;

    const idx = dayPosition % eps.length;
    return eps[idx];
  }

  selectDay(idx: number): void {
    this.selectedDay.set(idx);
    this.rebuildCache();
  }

  isToday(idx: number): boolean {
    const d = this.currentTime().getDay();
    const todayIdx = d === 0 ? 6 : d - 1;
    return idx === todayIdx;
  }

  private normalizeDia(d: string): string {
    return d.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  formatDuracao(duracao: string | null): string {
    if (!duracao) return '--:--';
    const parts = duracao.split(':');
    if (parts.length === 3) {
      const h = parseInt(parts[0]) || 0;
      const m = parseInt(parts[1]) || 0;
      const s = parseInt(parts[2]) || 0;
      if (h > 0) return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
      return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }
    return duracao;
  }

  formatTxExPx(ep: { aTemporada: number | null; aNumero: number | null; aParte: number | null }): SafeHtml {
    const parts: string[] = [];
    if (ep.aTemporada) parts.push(`<span style="color:#f472b6;font-weight:bold;">T${ep.aTemporada}</span>`);
    if (ep.aParte != null) parts.push(`<span style="color:#facc15;font-weight:bold;">P${ep.aParte === 0 ? 1 : ep.aParte}</span>`);
    if (ep.aNumero) parts.push(`<span style="color:#60a5fa;font-weight:bold;">E${ep.aNumero}</span>`);
    return this.sanitizer.bypassSecurityTrustHtml(parts.join(' '));
  }

  tipoColor(tipo: string | null): string {
    if (!tipo) return 'border-gray-600 bg-gray-800/80';
    if (tipo.includes('Inédito')) return 'border-blue-600 bg-blue-950/60';
    if (tipo.includes('Rep')) return 'border-yellow-600 bg-yellow-950/60';
    if (tipo.includes('Maratona')) return 'border-purple-600 bg-purple-950/60';
    if (tipo.includes('Especial')) return 'border-red-600 bg-red-950/60';
    return 'border-gray-600 bg-gray-800/80';
  }

  tipoBadgeClass(tipo: string | null): string {
    if (!tipo) return 'badge-default';
    if (tipo.includes('Inédito')) return 'badge-inedito';
    if (tipo.includes('Rep')) return 'badge-reprise';
    if (tipo.includes('Maratona')) return 'badge-maratona';
    if (tipo.includes('Especial')) return 'badge-especial';
    return 'badge-default';
  }

  isCurrentSlot(bloco: BlocoOutput): boolean {
    const now = this.currentTime();
    const currentDay = now.getDay() === 0 ? 6 : now.getDay() - 1;
    if (currentDay !== this.selectedDay()) return false;

    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes() < 30 ? '00' : '30';
    const currentTime = `${h}:${m}`;

    const blocoTime = bloco.aHorario?.substring(0, 5) ?? '';
    return blocoTime === currentTime;
  }

  blocoAccentColor(tipo: string | null): string {
    if (!tipo) return '#6b7280';
    if (tipo.includes('Inédito')) return '#3b82f6';
    if (tipo.includes('Rep')) return '#eab308';
    if (tipo.includes('Maratona')) return '#a855f7';
    if (tipo.includes('Especial')) return '#ef4444';
    return '#6b7280';
  }

  navigateToPlayer(epId: number): void {
    this.router.navigate(['/player'], { queryParams: { episodio: epId } });
  }
}
