import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NgStyle } from '@angular/common';
import { TvService, GradeOutput, BlocoOutput, ProgramaOutput } from '../../services/tv.service';

interface EpisodioInfo {
  aId: number;
  aNumero: number | null;
  aTemporada: number | null;
  aParte: number | null;
  aTitulo: string | null;
  aDuracao: string | null;
}

@Component({
  selector: 'app-grade',
  imports: [RouterLink, FormsModule, NgStyle],
  templateUrl: './grade.html',
  styleUrl: './grade.css',
})
export class Grade implements OnInit, OnDestroy {

  readonly tvService = inject(TvService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  readonly grades = signal<GradeOutput[]>([]);
  readonly blocos = signal<BlocoOutput[]>([]);
  readonly loading = signal(true);
  readonly selectedGradeId = signal<number | null>(null);

  private _timerInterval: any;
  readonly currentTime = signal(new Date());

  readonly dias = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
  readonly diasAbrev = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

  readonly faixaRanges: { nome: string; inicio: string; icon: string }[] = [
    { nome: 'Madrugada', inicio: '00:00', icon: '🌙' },
    { nome: 'Manhã', inicio: '06:00', icon: '☀️' },
    { nome: 'Tarde', inicio: '12:00', icon: '🌤' },
    { nome: 'Noite', inicio: '18:00', icon: '🌃' },
    { nome: 'Prime Time', inicio: '22:00', icon: '⭐' },
  ];

  horarios: string[] = [];

  private allEpisodiosMap = new Map<number, EpisodioInfo[]>();
  private diasProgramaMap = new Map<number, number[]>();

  readonly modalOpen = signal(false);
  readonly modalDia = signal('');
  readonly modalHorario = signal('');
  readonly modalGradeId = signal<number | null>(null);
  readonly modalTipoCode = signal('IN');
  readonly modalProgramaSearch = signal('');
  readonly modalProgramas = signal<ProgramaOutput[]>([]);
  readonly modalSelectedPrograma = signal<ProgramaOutput | null>(null);
  readonly modalSaving = signal(false);
  readonly modalEpisodios = signal<{ aId: number; aNumero: number | null; aTemporada: number | null; aParte: number | null; aTitulo: string | null }[]>([]);
  readonly modalSelectedEpisodio = signal<{ aId: number; aNumero: number | null; aTemporada: number | null; aParte: number | null; aTitulo: string | null } | null>(null);

  readonly detailOpen = signal(false);
  readonly detailBloco = signal<BlocoOutput | null>(null);
  readonly detailEpisodio = signal<EpisodioInfo | null>(null);
  readonly detailDia = signal('');
  readonly detailDeleting = signal(false);

  readonly currentPage = signal(0);
  readonly EPISODES_PER_PAGE = 5;
  readonly totalPages = signal(1);
  readonly pageLabels: string[] = [];

  readonly diasCodigo: Record<string, string> = {
    'Segunda-feira': 'SE', 'Terça-feira': 'TE', 'Quarta-feira': 'QA',
    'Quinta-feira': 'QI', 'Sexta-feira': 'SX', 'Sábado': 'SA', 'Domingo': 'DO',
  };

  readonly tiposBloco = [
    { code: 'IN', desc: 'Inédito' },
    { code: 'RE', desc: 'Reprise' },
    { code: 'MA', desc: 'Maratona' },
    { code: 'ES', desc: 'Especial' },
  ];

  ngOnInit(): void {
    this._timerInterval = setInterval(() => this.currentTime.set(new Date()), 30000);
    this.tvService.listGrades(0, 100).subscribe({
      next: (res) => {
        this.grades.set(res.aGrades);
        this.loadBlocos();
      },
      error: () => {
        this.grades.set([]);
        this.loadBlocos();
      },
    });
  }

  ngOnDestroy(): void {
    if (this._timerInterval) clearInterval(this._timerInterval);
  }

  loadBlocos(): void {
    this.loading.set(true);
    this.tvService.listBlocos(0, 400).subscribe({
      next: (res) => {
        this.blocos.set(res.aBlocos);
        this.computeHorarios(res.aBlocos);
        this.loadEpisodios(res.aBlocos);
      },
      error: () => {
        this.blocos.set([]);
        this.loading.set(false);
      },
    });
  }

  private computeHorarios(blocos: BlocoOutput[]): void {
    const times = new Set<string>();
    for (const b of blocos) {
      if (b.aHorario) {
        const h = b.aHorario.substring(0, 5);
        times.add(h);
      }
    }
    this.horarios = [...times].sort((a, b) => a.localeCompare(b));
  }

  private loadEpisodios(blocos: BlocoOutput[]): void {
    const programIds = [...new Set(blocos.filter(b => b.aPrograma).map(b => b.aPrograma!.aId))];
    if (programIds.length === 0) {
      this.loading.set(false);
      return;
    }

    const diasIndice = new Map(this.dias.map((d, i) => [d, i]));
    const diasIndiceNorm = new Map(this.dias.map((d, i) => [this.normalizeDia(d), i]));

    for (const pid of programIds) {
      const diasQuePassa = [...new Set(
        blocos
          .filter(b => b.aPrograma?.aId === pid && b.aDiaSemanaDesc)
          .map(b => diasIndice.get(b.aDiaSemanaDesc!) ?? diasIndiceNorm.get(this.normalizeDia(b.aDiaSemanaDesc!)) ?? -1)
      )      ].filter(d => d >= 0).sort((a, b) => a - b);
      this.diasProgramaMap.set(pid, diasQuePassa);
    }

    const maxEpisodesNeeded = 10000;
    this.tvService.listPrimeirosEpisodiosPorPrograma(programIds, maxEpisodesNeeded).subscribe({
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

        let maxEps = 0;
        for (const [pid, eps] of grouped) {
          eps.sort((a, b) => ((a.aTemporada ?? 0) - (b.aTemporada ?? 0)) || ((a.aParte ?? 0) - (b.aParte ?? 0)) || ((a.aNumero ?? 0) - (b.aNumero ?? 0)));
          this.allEpisodiosMap.set(pid, eps);
          if (eps.length > maxEps) maxEps = eps.length;
        }

        const pages = Math.max(1, Math.ceil(maxEps / this.EPISODES_PER_PAGE));
        this.totalPages.set(pages);
        this.pageLabels.length = 0;
        for (let p = 0; p < pages; p++) {
          const start = p * this.EPISODES_PER_PAGE + 1;
          const end = Math.min((p + 1) * this.EPISODES_PER_PAGE, maxEps);
          this.pageLabels.push(`Ep ${start.toString().padStart(2, '0')}-${end.toString().padStart(2, '0')}`);
        }

        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  filterByGrade(gradeId: number | null): void {
    this.selectedGradeId.set(gradeId);
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.currentPage.set(page);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  prevPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  get filteredBlocos(): BlocoOutput[] {
    const gid = this.selectedGradeId();
    if (gid === null) return this.blocos();
    return this.blocos().filter(b => b.aGrade?.aId === gid);
  }

  selectBloco(bloco: BlocoOutput, dia: string): void {
    this.detailBloco.set(bloco);
    this.detailEpisodio.set(this.getEpisodio(bloco, dia));
    this.detailDia.set(dia);
    this.detailDeleting.set(false);
    this.detailOpen.set(true);
  }

  closeDetail(): void {
    this.detailOpen.set(false);
  }

  watchBloco(): void {
    const ep = this.detailEpisodio();
    if (ep) {
      this.closeDetail();
      this.router.navigate(['/player'], { queryParams: { episodio: ep.aId } });
    }
  }

  deleteBloco(): void {
    const bloco = this.detailBloco();
    if (!bloco) return;
    this.detailDeleting.set(true);
    this.tvService.deleteBloco(bloco.aId).subscribe({
      next: () => {
        this.closeDetail();
        this.loadBlocos();
      },
      error: () => {
        this.detailDeleting.set(false);
      },
    });
  }

  getEpisodio(bloco: BlocoOutput, dia: string): EpisodioInfo | null {
    if (!bloco.aPrograma) return null;
    const eps = this.allEpisodiosMap.get(bloco.aPrograma.aId);
    if (!eps || eps.length === 0) return null;

    const diasQuePassa = this.diasProgramaMap.get(bloco.aPrograma.aId);
    if (!diasQuePassa || diasQuePassa.length === 0) return null;

    const diaIdx = this.dias.indexOf(dia);
    const dayPosition = diasQuePassa.indexOf(diaIdx);
    if (dayPosition < 0) return null;

    const pageOffset = this.currentPage() * this.EPISODES_PER_PAGE;
    const idx = (dayPosition + pageOffset) % eps.length;
    return eps[idx];
  }

  blocosFor(dia: string, horario: string): BlocoOutput[] {
    return this.filteredBlocos
      .filter(b => this.normalizeDia(b.aDiaSemanaDesc ?? '') === this.normalizeDia(dia) && b.aHorario?.substring(0, 5) === horario)
      .sort((a, b) => (a.aHorario ?? '').localeCompare(b.aHorario ?? ''));
  }

  formatDuracao(duracao: string | null): string {
    if (!duracao) return '--:--';
    const parts = duracao.split(':');
    if (parts.length === 3) {
      const h = parseInt(parts[0]) || 0;
      const m = parseInt(parts[1]) || 0;
      const s = parseInt(parts[2]) || 0;
      if (h > 0) {
        return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
      }
      return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }
    const sec = parseFloat(duracao);
    if (isNaN(sec)) return duracao;
    const m = Math.floor(sec / 60);
    const s = Math.round(sec) % 60;
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  }

  getTempoLivre(ep: EpisodioInfo): string | null {
    if (!ep.aDuracao) return null;
    const parts = ep.aDuracao.split(':');
    if (parts.length !== 3) return null;
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    const s = parseInt(parts[2]) || 0;
    const totalSec = h * 3600 + m * 60 + s;
    const livre = 30 * 60 - totalSec;
    if (livre <= 0) return '00:00';
    const lm = Math.floor(livre / 60);
    const ls = livre % 60;
    return `${lm.toString().padStart(2,'0')}:${ls.toString().padStart(2,'0')}`;
  }


  formatTxExPx(ep: { aTemporada: number | null; aNumero: number | null; aParte: number | null }): SafeHtml {
    const parts: string[] = [];
    if (ep.aTemporada) parts.push(`<span style="color:#f472b6;font-weight:bold;">T${ep.aTemporada}</span>`);
    if (ep.aParte != null) parts.push(`<span style="color:#facc15;font-weight:bold;">P${ep.aParte === 0 ? 1 : ep.aParte}</span>`);
    if (ep.aNumero) parts.push(`<span style="color:#60a5fa;font-weight:bold;">E${ep.aNumero}</span>`);
    return this.sanitizer.bypassSecurityTrustHtml(parts.join(' '));
  }

  private normalizeDia(d: string): string {
    return d.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  faixaNome(horario: string): string {
    for (let i = this.faixaRanges.length - 1; i >= 0; i--) {
      if (horario >= this.faixaRanges[i].inicio) return this.faixaRanges[i].nome;
    }
    return '';
  }

  faixaIcon(horario: string): string {
    for (let i = this.faixaRanges.length - 1; i >= 0; i--) {
      if (horario >= this.faixaRanges[i].inicio) return this.faixaRanges[i].icon;
    }
    return '📺';
  }

  showFaixaHeader(horario: string, index: number): boolean {
    if (index === 0) return true;
    return this.faixaNome(horario) !== this.faixaNome(this.horarios[index - 1]);
  }

  openCellModal(dia: string, horario: string): void {
    const gradeId = this.selectedGradeId() ?? (this.grades().length > 0 ? this.grades()[0].aId : null);
    this.modalDia.set(dia);
    this.modalHorario.set(horario);
    this.modalGradeId.set(gradeId);
    this.modalTipoCode.set('IN');
    this.modalProgramaSearch.set('');
    this.modalProgramas.set([]);
    this.modalSelectedPrograma.set(null);
    this.modalOpen.set(true);
    this.searchProgramas('');
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  searchProgramas(term: string): void {
    this.modalProgramaSearch.set(term);
    this.tvService.listProgramas(0, 1000, term).subscribe({
      next: (res) => this.modalProgramas.set(res.aProgramas),
      error: () => this.modalProgramas.set([]),
    });
  }

  selectProgramaModal(p: ProgramaOutput): void {
    this.modalSelectedPrograma.set(p);
    this.modalProgramaSearch.set(p.aNome);
    this.modalEpisodios.set([]);
    this.modalSelectedEpisodio.set(null);
    this.tvService.listEpisodios(0, 10000, p.aId).subscribe({
      next: (res) => {
        const eps = res.aEpisodios.map(e => ({ aId: e.aId, aNumero: e.aNumero, aTemporada: e.aTemporada, aParte: e.aParte, aTitulo: e.aTitulo }));
        eps.sort((a, b) => ((a.aTemporada ?? 0) - (b.aTemporada ?? 0)) || ((a.aParte ?? 0) - (b.aParte ?? 0)) || ((a.aNumero ?? 0) - (b.aNumero ?? 0)));
        this.modalEpisodios.set(eps);
      },
      error: () => this.modalEpisodios.set([]),
    });
  }

  faixaCode(horario: string): string {
    const nome = this.faixaNome(horario);
    const map: Record<string, string> = { 'Madrugada': 'MA', 'Manhã': 'MN', 'Tarde': 'TA', 'Noite': 'NO', 'Prime Time': 'PT' };
    return map[nome] ?? 'MA';
  }

  submitBloco(): void {
    const programa = this.modalSelectedPrograma();
    const gradeId = this.modalGradeId();
    if (!programa || !gradeId) return;

    this.modalSaving.set(true);
    this.tvService.createBloco({
      aProgramaId: programa.aId,
      aHorario: this.modalHorario(),
      aGradeId: gradeId,
      aDiaSemanaCode: this.diasCodigo[this.modalDia()] ?? 'SE',
      aFaixaHorarioCode: this.faixaCode(this.modalHorario()),
      aTipoBlocoCode: this.modalTipoCode(),
    }).subscribe({
      next: () => {
        this.closeModal();
        this.loadBlocos();
      },
      error: () => {
        this.modalSaving.set(false);
      },
    });
  }

  tipoColor(tipo: string | null): string {
    if (!tipo) return 'border-gray-600 bg-gray-800/80';
    if (tipo.includes('Inédito')) return 'border-blue-600 bg-blue-950/60';
    if (tipo.includes('Rep')) return 'border-yellow-600 bg-yellow-950/60';
    if (tipo.includes('Maratona')) return 'border-purple-600 bg-purple-950/60';
    if (tipo.includes('Especial')) return 'border-red-600 bg-red-950/60';
    return 'border-gray-600 bg-gray-800/80';
  }

  accentColor(tipo: string | null): string {
    if (!tipo) return '#6b7280';
    if (tipo.includes('Inédito')) return '#3b82f6';
    if (tipo.includes('Rep')) return '#eab308';
    if (tipo.includes('Maratona')) return '#a855f7';
    if (tipo.includes('Especial')) return '#ef4444';
    return '#6b7280';
  }

  tipoCardBg(tipo: string | null): string {
    if (!tipo) return 'bg-gray-800/70';
    if (tipo.includes('Inédito')) return 'bg-blue-950/40';
    if (tipo.includes('Rep')) return 'bg-yellow-950/40';
    if (tipo.includes('Maratona')) return 'bg-purple-950/40';
    if (tipo.includes('Especial')) return 'bg-red-950/40';
    return 'bg-gray-800/70';
  }

  tipoBadgeColor(tipo: string | null): string {
    if (!tipo) return 'bg-gray-700 text-gray-400';
    if (tipo.includes('Inédito')) return 'bg-blue-900 text-blue-300';
    if (tipo.includes('Rep')) return 'bg-yellow-900 text-yellow-300';
    if (tipo.includes('Maratona')) return 'bg-purple-900 text-purple-300';
    if (tipo.includes('Especial')) return 'bg-red-900 text-red-300';
    return 'bg-gray-700 text-gray-400';
  }

  get nowDayIndex(): number {
    const d = this.currentTime().getDay();
    return d === 0 ? 6 : d - 1;
  }

  isToday(dia: string): boolean {
    return dia === this.dias[this.nowDayIndex];
  }

  nowTimeSlot(): string {
    const now = this.currentTime();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes() < 30 ? '00' : '30';
    return `${h}:${m}`;
  }

  nowMinuteFraction(): number {
    const now = this.currentTime();
    return (now.getMinutes() % 30) / 30;
  }

  nowLineStyle(): Record<string, string> {
    const i = this.nowDayIndex;
    const offset = `calc(121px + ${i} * ((100% - 126px) / 7))`;
    const width = 'calc((100% - 126px) / 7)';
    return {
      left: offset,
      width: width,
      top: `${this.nowMinuteFraction() * 100}%`,
    };
  }

  getTipoDinamico(bloco: BlocoOutput, dia: string): string {
    const original = bloco.aTipoBlocoDesc ?? '';
    if (original.includes('Maratona') || original.includes('Especial')) return original;
    if (original.includes('Reprise')) return 'Reprise';

    if (!bloco.aPrograma) return original || 'Inédito';

    const programaId = bloco.aPrograma.aId;
    const eps = this.allEpisodiosMap.get(programaId);
    if (!eps || eps.length === 0) return original || 'Inédito';

    const diasQuePassa = this.diasProgramaMap.get(programaId);
    if (!diasQuePassa || diasQuePassa.length === 0) return original || 'Inédito';

    const diaIdx = this.dias.indexOf(dia);
    const dayPosition = diasQuePassa.indexOf(diaIdx);
    if (dayPosition < 0) return original || 'Inédito';

    const currentTime = bloco.aHorario?.substring(0, 5) ?? '';
    const mesmoDia = this.filteredBlocos.some(b =>
      b.aId !== bloco.aId &&
      b.aPrograma?.aId === programaId &&
      b.aDiaSemanaDesc === dia &&
      (b.aHorario?.substring(0, 5) ?? '') < currentTime
    );
    if (mesmoDia) return 'Reprise';

    const pageOffset = this.currentPage() * this.EPISODES_PER_PAGE;
    const currentIdx = (dayPosition + pageOffset) % eps.length;

    for (let p = 0; p < this.currentPage(); p++) {
      const pOffset = p * this.EPISODES_PER_PAGE;
      for (const dp of diasQuePassa) {
        if ((dp + pOffset) % eps.length === currentIdx) return 'Reprise';
      }
    }

    return original || 'Inédito';
  }
}
