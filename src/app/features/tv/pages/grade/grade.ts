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
  private effectiveSchedule = new Map<string, BlocoOutput[]>();
  private consumedSlots = new Set<string>();
  private displacedOriginalDay = new Map<number, number>();
  private programaRemovedDias = new Map<number, number[]>();
  private slotPositionMap = new Map<string, number>();
  private episodioCache = new Map<number, EpisodioInfo | null>();
  private sameDayBlocosCache = new Map<string, BlocoOutput[]>();
  private displacedEpisodeShift = new Map<number, number>();

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

  private parseDuracaoSec(duracao: string | null): number {
    if (!duracao) return 0;
    const p = duracao.split(':');
    if (p.length !== 3) return 0;
    return (parseInt(p[0]) || 0) * 3600 + (parseInt(p[1]) || 0) * 60 + (parseInt(p[2]) || 0);
  }

  private addTime(time: string, addMin: number): string {
    const [h, m] = time.split(':').map(Number);
    let total = h * 60 + m + addMin;
    total = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
    const nh = Math.floor(total / 60).toString().padStart(2, '0');
    const nm = (total % 60).toString().padStart(2, '0');
    return `${nh}:${nm}`;
  }

  private computeBaseRemovedDias(): void {
    this.programaRemovedDias.clear();
    this.displacedOriginalDay.clear();
    const diasIndice = new Map(this.dias.map((d, i) => [d, i]));
    const diasIndiceNorm = new Map(this.dias.map((d, i) => [this.normalizeDia(d), i]));
    const dbSchedule = new Map<string, BlocoOutput[]>();
    for (const b of this.filteredBlocos) {
      const dIdx = diasIndice.get(b.aDiaSemanaDesc ?? '') ?? diasIndiceNorm.get(this.normalizeDia(b.aDiaSemanaDesc ?? '')) ?? -1;
      if (dIdx < 0 || !b.aHorario) continue;
      const key = `${dIdx}|${b.aHorario.substring(0, 5)}`;
      if (!dbSchedule.has(key)) dbSchedule.set(key, []);
      dbSchedule.get(key)!.push(b);
    }
    const sortedHorarios = [...this.horarios].sort((a, b) => a.localeCompare(b));
    for (let d = 0; d < 7; d++) {
      for (const t of sortedHorarios) {
        const key = `${d}|${t}`;
        const cellBlocos = dbSchedule.get(key);
        if (!cellBlocos) continue;
        for (const bloco of cellBlocos) {
          if (bloco.aPrograma?.aId === 35) continue;
          const ep = this.getEpisodioBase(bloco, d);
          if (!ep || !ep.aDuracao) continue;
          if (this.parseDuracaoSec(ep.aDuracao) <= 30*60) continue;
          const slotsNeeded = Math.ceil(this.parseDuracaoSec(ep.aDuracao) / (30*60));
          for (let s=1; s<slotsNeeded; s++) {
            const consumedTime = this.addTime(t, s*30);
            const consumedKey = `${d}|${consumedTime}`;
            const dbAtSlot = dbSchedule.get(consumedKey);
            if (!dbAtSlot) continue;
            for (const displaced of dbAtSlot) {
              if (displaced.aId===bloco.aId) continue;
              if (displaced.aPrograma?.aId===35) continue;
              if (this.displacedOriginalDay.has(displaced.aId)) continue;
              this.displacedOriginalDay.set(displaced.aId, d);
              const pid = displaced.aPrograma!.aId;
              if (!this.programaRemovedDias.has(pid)) this.programaRemovedDias.set(pid, []);
              if (!this.programaRemovedDias.get(pid)!.includes(d)) this.programaRemovedDias.get(pid)!.push(d);
            }
          }
        }
      }
    }
  }

  private computeEffectiveSchedule(): void {
    this.effectiveSchedule.clear();
    this.consumedSlots.clear();
    this.slotPositionMap.clear();
    this.displacedEpisodeShift.clear();

    const diasIndice = new Map(this.dias.map((d, i) => [d, i]));
    const diasIndiceNorm = new Map(this.dias.map((d, i) => [this.normalizeDia(d), i]));

    const dbSchedule = new Map<string, BlocoOutput[]>();
    for (const b of this.filteredBlocos) {
      const dIdx = diasIndice.get(b.aDiaSemanaDesc ?? '') ?? diasIndiceNorm.get(this.normalizeDia(b.aDiaSemanaDesc ?? '')) ?? -1;
      if (dIdx < 0 || !b.aHorario) continue;
      const key = `${dIdx}|${b.aHorario.substring(0, 5)}`;
      if (!dbSchedule.has(key)) dbSchedule.set(key, []);
      dbSchedule.get(key)!.push(b);
    }

    for (const [k, v] of dbSchedule) {
      this.effectiveSchedule.set(k, [...v]);
      this.slotPositionMap.set(k, 0);
    }

    const sortedHorarios = [...this.horarios].sort((a, b) => a.localeCompare(b));

    const displacedByDay = new Map<number, { bloco: BlocoOutput; fromTime: string }[]>();

    for (let d = 0; d < 7; d++) {
      for (const t of sortedHorarios) {
        const key = `${d}|${t}`;
        const cellBlocos = this.effectiveSchedule.get(key);
        if (!cellBlocos || cellBlocos.length === 0) continue;

        for (const bloco of [...cellBlocos]) {
          if (bloco.aPrograma?.aId === 35) continue;
          if (bloco.aHorario?.substring(0, 5) !== t) continue;
          const ep = this.getEpisodioBase(bloco, d);
          if (!ep || !ep.aDuracao) continue;
          const epSec = this.parseDuracaoSec(ep.aDuracao);
          if (epSec <= 30 * 60) continue;

          const slotsNeeded = Math.ceil(epSec / (30 * 60));
          for (let s = 1; s < slotsNeeded; s++) {
            const consumedTime = this.addTime(t, s * 30);
            if (consumedTime <= t) continue;
            const consumedKey = `${d}|${consumedTime}`;
            this.consumedSlots.add(consumedKey);
            this.slotPositionMap.set(consumedKey, s);

            if (!this.effectiveSchedule.has(consumedKey)) {
              this.effectiveSchedule.set(consumedKey, []);
            }
            if (!this.effectiveSchedule.get(consumedKey)!.some(b => b.aId === bloco.aId)) {
              this.effectiveSchedule.get(consumedKey)!.push(bloco);
            }

            const dbAtSlot = dbSchedule.get(consumedKey);
            if (dbAtSlot) {
              for (const displaced of dbAtSlot) {
                if (displaced.aId === bloco.aId) continue;
                if (displaced.aPrograma?.aId === 35) continue;
                const curList = this.effectiveSchedule.get(consumedKey)!;
                const idx = curList.findIndex(b => b.aId === displaced.aId);
                if (idx >= 0) curList.splice(idx, 1);
                if (!displacedByDay.has(d)) displacedByDay.set(d, []);
                displacedByDay.get(d)!.push({ bloco: displaced, fromTime: consumedTime });
              }
            }
          }
        }
      }
    }

    for (const [d, displacedList] of displacedByDay) {
      for (const { bloco: displaced, fromTime } of displacedList) {
        if (this.displacedEpisodeShift.has(displaced.aId)) continue;
        let shift = 0;
        let nextTime = fromTime;
        for (let attempt = 0; attempt < 20; attempt++) {
          nextTime = this.addTime(nextTime, 30);
          shift++;
          const nextKey = `${d}|${nextTime}`;
          if (this.consumedSlots.has(nextKey)) continue;
          if (!this.effectiveSchedule.has(nextKey)) {
            this.effectiveSchedule.set(nextKey, []);
          }
          const existingList = this.effectiveSchedule.get(nextKey)!;
          if (existingList.length > 0) continue;
          existingList.push(displaced);
          this.slotPositionMap.set(nextKey, shift);
          this.displacedEpisodeShift.set(displaced.aId, shift);
          break;
        }
      }
    }

    const consumedTimes = new Set<string>();
    for (const k of this.consumedSlots) {
      const time = k.split('|')[1];
      if (time) consumedTimes.add(time);
    }
    for (const ct of consumedTimes) {
      if (!this.horarios.includes(ct)) this.horarios.push(ct);
    }
    this.horarios.sort((a, b) => a.localeCompare(b));
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

        let maxPages = 1;
        for (const [pid, eps] of grouped) {
          eps.sort((a, b) => ((a.aTemporada ?? 0) - (b.aTemporada ?? 0)) || ((a.aParte ?? 0) - (b.aParte ?? 0)) || ((a.aNumero ?? 0) - (b.aNumero ?? 0)));
          this.allEpisodiosMap.set(pid, eps);
          const diasQuePassa = this.diasProgramaMap.get(pid) ?? [];
          const weekendDias = diasQuePassa.filter(d => d === 5 || d === 6);
          let pageSize = this.EPISODES_PER_PAGE;
          if (weekendDias.length > 0) {
            let minSlots = Infinity;
            for (const wd of weekendDias) {
              const count = blocos.filter(b => b.aPrograma?.aId === pid && this.normalizeDia(b.aDiaSemanaDesc ?? '') === this.normalizeDia(this.dias[wd])).length;
              if (count > 0 && count < minSlots) minSlots = count;
            }
            if (minSlots < Infinity && minSlots > 0) pageSize = minSlots;
          }
          const progPages = Math.max(1, Math.ceil(eps.length / pageSize));
          if (progPages > maxPages) maxPages = progPages;
        }

        this.totalPages.set(maxPages);
        this.pageLabels.length = 0;
        for (let p = 0; p < maxPages; p++) {
          this.pageLabels.push(`Página ${p + 1}`);
        }

        this.computeBaseRemovedDias();
        this.buildSameDayBlocosCache();
        this.computeEffectiveSchedule();
        this.rebuildEpisodioCache();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  filterByGrade(gradeId: number | null): void {
    this.selectedGradeId.set(gradeId);
    if (this.allEpisodiosMap.size > 0) {
      this.computeBaseRemovedDias();
      this.buildSameDayBlocosCache();
      this.computeEffectiveSchedule();
      this.rebuildEpisodioCache();
    }
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.currentPage.set(page);
    this.rebuildEpisodioCache();
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  prevPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  get filteredBlocos(): BlocoOutput[] {
    const gid = this.selectedGradeId();
    let list = this.blocos().filter(b => b.aStatusCode === 'AT');
    if (gid !== null) list = list.filter(b => b.aGrade?.aId === gid);
    return list;
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

  private buildSameDayBlocosCache(): void {
    this.sameDayBlocosCache.clear();
    const diasIndice = new Map(this.dias.map((d, i) => [d, i]));
    const diasIndiceNorm = new Map(this.dias.map((d, i) => [this.normalizeDia(d), i]));
    const grouped = new Map<string, BlocoOutput[]>();
    for (const b of this.filteredBlocos) {
      if (!b.aPrograma || !b.aDiaSemanaDesc) continue;
      const dIdx = diasIndice.get(b.aDiaSemanaDesc) ?? diasIndiceNorm.get(this.normalizeDia(b.aDiaSemanaDesc)) ?? -1;
      if (dIdx < 0) continue;
      const key = `${b.aPrograma.aId}|${dIdx}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(b);
    }
    for (const [key, list] of grouped) {
      this.sameDayBlocosCache.set(key, list.sort((a, b) => (a.aHorario ?? '').localeCompare(b.aHorario ?? '')));
    }
  }

  private rebuildEpisodioCache(): void {
    this.episodioCache.clear();
    for (const b of this.filteredBlocos) {
      this.episodioCache.set(b.aId, this.getEpisodioUncached(b));
    }
  }

  private getEpisodioUncached(bloco: BlocoOutput): EpisodioInfo | null {
    if (!bloco.aPrograma) return null;
    const eps = this.allEpisodiosMap.get(bloco.aPrograma.aId);
    if (!eps || eps.length === 0) return null;
    const diasQuePassa = this.diasProgramaMap.get(bloco.aPrograma.aId);
    if (!diasQuePassa || diasQuePassa.length === 0) return null;

    const diaSemana = bloco.aDiaSemanaDesc ?? '';
    const diasIndice = new Map(this.dias.map((d, i) => [d, i]));
    const diasIndiceNorm = new Map(this.dias.map((d, i) => [this.normalizeDia(d), i]));
    const diaIdx = diasIndice.get(diaSemana) ?? diasIndiceNorm.get(this.normalizeDia(diaSemana)) ?? -1;
    if (diaIdx < 0) return null;

    const dayPosition = diasQuePassa.indexOf(diaIdx);
    if (dayPosition < 0) return null;

    if (this.isFimDeSemana(this.dias[diaIdx])) {
      const programaId = bloco.aPrograma.aId;
      const cacheKey = `${programaId}|${diaIdx}`;
      const sameDayBlocos = this.sameDayBlocosCache.get(cacheKey) ?? [];
      const numSlots = sameDayBlocos.length;
      if (numSlots === 0) return null;
      const slotOffset = sameDayBlocos.findIndex(b => b.aId === bloco.aId);
      if (slotOffset < 0) return null;
      const pageOffset = this.currentPage() * numSlots;
      const shift = this.displacedEpisodeShift.get(bloco.aId) ?? 0;
      const finalIdx = (((pageOffset + slotOffset) - shift) % eps.length + eps.length) % eps.length;
      return eps[finalIdx];
    }

    const pageOffset = this.currentPage() * this.EPISODES_PER_PAGE;
    const globalIdx = dayPosition + pageOffset;
    const removedDias = this.programaRemovedDias.get(bloco.aPrograma.aId) ?? [];
    let totalOffset = 0;
    for (const rd of removedDias) {
      const rdPos = diasQuePassa.indexOf(rd);
      if (rdPos < 0) continue;
      for (let p = 0; p <= this.currentPage(); p++) {
        const globalRemoved = rdPos + p * this.EPISODES_PER_PAGE;
        if (globalRemoved >= globalIdx) break;
        let isConsumed = false;
        for (const b of this.filteredBlocos) {
          if (this.normalizeDia(b.aDiaSemanaDesc ?? '') !== this.normalizeDia(this.dias[rd])) continue;
          if ((b.aHorario?.substring(0,5) ?? '') !== '00:00') continue;
          const eps2 = this.allEpisodiosMap.get(b.aPrograma!.aId);
          const dias2 = this.diasProgramaMap.get(b.aPrograma!.aId);
          if (!eps2 || !dias2) continue;
          const pos2 = dias2.indexOf(rd);
          if (pos2 < 0) continue;
          const idx2 = (pos2 + p * this.EPISODES_PER_PAGE) % eps2.length;
          const ep2 = eps2[idx2];
          if (ep2 && this.parseDuracaoSec(ep2.aDuracao) > 30*60) { isConsumed = true; break; }
        }
        if (isConsumed) totalOffset++;
      }
    }
    const shift = this.displacedEpisodeShift.get(bloco.aId) ?? 0;
    const finalIdx = (((globalIdx + totalOffset) - shift) % eps.length + eps.length) % eps.length;
    return eps[finalIdx];
  }

  private getEpisodioRaw(bloco: BlocoOutput, diaIdx: number): EpisodioInfo | null {
    if (!bloco.aPrograma) return null;
    const eps = this.allEpisodiosMap.get(bloco.aPrograma.aId);
    if (!eps || eps.length === 0) return null;
    const diasQuePassa = this.diasProgramaMap.get(bloco.aPrograma.aId);
    if (!diasQuePassa || diasQuePassa.length === 0) return null;
    const dayPosition = diasQuePassa.indexOf(diaIdx);
    if (dayPosition < 0) return null;
    const diaName = this.dias[diaIdx];
    if (this.isFimDeSemana(diaName)) {
      const programaId = bloco.aPrograma.aId;
      const sameDayBlocos = this.filteredBlocos
        .filter(b => b.aPrograma?.aId === programaId && this.normalizeDia(b.aDiaSemanaDesc ?? '') === this.normalizeDia(diaName))
        .sort((a, b) => (a.aHorario ?? '').localeCompare(b.aHorario ?? ''));
      const numSlots = sameDayBlocos.length;
      const slotOffset = sameDayBlocos.findIndex(b => b.aId === bloco.aId);
      const pageOffset = this.currentPage() * numSlots;
      const finalIdx = (pageOffset + slotOffset) % eps.length;
      return eps[finalIdx];
    }
    const pageOffset = this.currentPage() * this.EPISODES_PER_PAGE;
    const idx = (dayPosition + pageOffset) % eps.length;
    return eps[idx];
  }

  private getEpisodioBase(bloco: BlocoOutput, diaIdx: number): EpisodioInfo | null {
    if (!bloco.aPrograma) return null;
    const eps = this.allEpisodiosMap.get(bloco.aPrograma.aId);
    if (!eps || eps.length === 0) return null;
    const diasQuePassa = this.diasProgramaMap.get(bloco.aPrograma.aId);
    if (!diasQuePassa || diasQuePassa.length === 0) return null;
    const dayPosition = diasQuePassa.indexOf(diaIdx);
    if (dayPosition < 0) return null;
    const idx = dayPosition % eps.length;
    return eps[idx];
  }

  getEpisodio(bloco: BlocoOutput, dia: string): EpisodioInfo | null {
    return this.episodioCache.get(bloco.aId) ?? null;
  }

  blocosFor(dia: string, horario: string): BlocoOutput[] {
    if (this.effectiveSchedule.size > 0) {
      const diasIndice = new Map(this.dias.map((d, i) => [d, i]));
      const diasIndiceNorm = new Map(this.dias.map((d, i) => [this.normalizeDia(d), i]));
      const dIdx = diasIndice.get(dia) ?? diasIndiceNorm.get(this.normalizeDia(dia)) ?? -1;
      if (dIdx >= 0) {
        const key = `${dIdx}|${horario}`;
        if (this.effectiveSchedule.has(key)) {
          return [...(this.effectiveSchedule.get(key) ?? [])].sort((a, b) => (a.aHorario ?? '').localeCompare(b.aHorario ?? ''));
        }
        return [];
      }
    }
    return this.filteredBlocos
      .filter(b => this.normalizeDia(b.aDiaSemanaDesc ?? '') === this.normalizeDia(dia) && b.aHorario?.substring(0, 5) === horario)
      .sort((a, b) => (a.aHorario ?? '').localeCompare(b.aHorario ?? ''));
  }

  private getAllBlocosForDia(dia: string): BlocoOutput[] {
    return this.filteredBlocos
      .filter(b => this.normalizeDia(b.aDiaSemanaDesc ?? '') === this.normalizeDia(dia))
      .sort((a, b) => (a.aHorario ?? '').localeCompare(b.aHorario ?? ''));
  }

  private countConsecutiveBlocos(bloco: BlocoOutput, dia: string): number {
    const allDay = this.getAllBlocosForDia(dia);
    const pid = bloco.aPrograma?.aId;
    if (!pid) return 1;
    const pIdx = allDay.findIndex(b => b.aId === bloco.aId);
    if (pIdx < 0) return 1;
    let count = 1;
    for (let j = pIdx + 1; j < allDay.length; j++) {
      if (allDay[j].aPrograma?.aId === pid) count++;
      else break;
    }
    for (let j = pIdx - 1; j >= 0; j--) {
      if (allDay[j].aPrograma?.aId === pid) count++;
      else break;
    }
    return count;
  }

  isMultiBloco(bloco: BlocoOutput, dia: string): boolean {
    if (bloco.aPrograma?.aId === 35) return false;
    const ep = this.getEpisodio(bloco, dia);
    if (!ep || !ep.aDuracao) return false;
    const totalSec = this.parseDuracaoSec(ep.aDuracao);
    return totalSec > 30 * 60;
  }

  private isFimDeSemana(dia: string): boolean {
    const idx = this.dias.indexOf(dia);
    return idx === 5 || idx === 6;
  }

  private tempoLivreSec(ep: EpisodioInfo): number {
    if (!ep.aDuracao) return 0;
    const p = ep.aDuracao.split(':');
    if (p.length !== 3) return 0;
    const totalSec = (parseInt(p[0]) || 0) * 3600 + (parseInt(p[1]) || 0) * 60 + (parseInt(p[2]) || 0);
    return Math.max(0, 30 * 60 - totalSec);
  }

  private formatSec(mm: number): string {
    const m = Math.floor(mm / 60);
    const s = mm % 60;
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  }

  private slotsForEpisode(ep: EpisodioInfo): number {
    if (!ep.aDuracao) return 1;
    const p = ep.aDuracao.split(':');
    if (p.length !== 3) return 1;
    const totalSec = (parseInt(p[0]) || 0) * 3600 + (parseInt(p[1]) || 0) * 60 + (parseInt(p[2]) || 0);
    return Math.max(1, Math.ceil(totalSec / (30 * 60)));
  }

  private slotIndex(dia: string, horario: string): number {
    const diasIndice = new Map(this.dias.map((d, i) => [d, i]));
    const diasIndiceNorm = new Map(this.dias.map((d, i) => [this.normalizeDia(d), i]));
    const dIdx = diasIndice.get(dia) ?? diasIndiceNorm.get(this.normalizeDia(dia)) ?? -1;
    if (dIdx < 0) return 0;
    return this.slotPositionMap.get(`${dIdx}|${horario}`) ?? 0;
  }

  private multiBlocoFreeTime(ep: EpisodioInfo): number {
    if (!ep.aDuracao) return 0;
    const p = ep.aDuracao.split(':');
    if (p.length !== 3) return 0;
    const totalSec = (parseInt(p[0]) || 0) * 3600 + (parseInt(p[1]) || 0) * 60 + (parseInt(p[2]) || 0);
    const slots = this.slotsForEpisode(ep);
    const totalSlotSec = slots * 30 * 60;
    return Math.max(0, totalSlotSec - totalSec);
  }

  getTempoLivreTopo(bloco: BlocoOutput, dia: string, horario?: string): string {
    if (this.isMultiBloco(bloco, dia)) {
      const h = horario ?? bloco.aHorario?.substring(0, 5) ?? '';
      const idx = this.slotIndex(dia, h);
      if (idx !== 0) return '00:00';
      const ep = this.getEpisodio(bloco, dia);
      if (!ep) return '00:00';
      const livre = this.multiBlocoFreeTime(ep);
      if (livre <= 0) return '00:00';
      return this.formatSec(Math.floor(livre / 2));
    }
    const ep = this.getEpisodio(bloco, dia);
    if (!ep) return '00:00';
    const livre = this.tempoLivreSec(ep);
    if (livre <= 0) return '00:00';
    return this.formatSec(Math.floor(livre / 2));
  }

  getTempoLivreBaixo(bloco: BlocoOutput, dia: string, horario?: string): string {
    const ep = this.getEpisodio(bloco, dia);
    if (!ep || !ep.aDuracao) return '00:00';

    if (!this.isMultiBloco(bloco, dia)) {
      const livre = this.tempoLivreSec(ep);
      if (livre <= 0) return '00:00';
      return this.formatSec(Math.ceil(livre / 2));
    }

    const h = horario ?? bloco.aHorario?.substring(0, 5) ?? '';
    const slots = this.slotsForEpisode(ep);
    const idx = this.slotIndex(dia, h);
    if (idx !== slots - 1) return '00:00';

    const livre = this.multiBlocoFreeTime(ep);
    if (livre <= 0) return '00:00';
    return this.formatSec(Math.ceil(livre / 2));
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
    const now = this.currentTime();
    const slotH = now.getHours();
    const slotM = now.getMinutes() < 30 ? 0 : 30;
    const slot = `${slotH.toString().padStart(2,'0')}:${slotM.toString().padStart(2,'0')}`;
    const dayName = this.dias[this.nowDayIndex];

    const todayBloco = this.filteredBlocos.find(b =>
      this.normalizeDia(b.aDiaSemanaDesc ?? '') === this.normalizeDia(dayName) &&
      b.aHorario?.substring(0, 5) === slot
    );

    const i = this.nowDayIndex;
    const offset = `calc(121px + ${i} * ((100% - 126px) / 7))`;
    const width = 'calc((100% - 126px) / 7)';

    if (!todayBloco) {
      return { left: offset, width, top: `${this.nowMinuteFraction() * 100}%` };
    }

    const ep = this.getEpisodio(todayBloco, dayName);
    if (!ep || !ep.aDuracao) {
      return { left: offset, width, top: `${this.nowMinuteFraction() * 100}%` };
    }

    const parts = ep.aDuracao.split(':');
    if (parts.length !== 3) {
      return { left: offset, width, top: `${this.nowMinuteFraction() * 100}%` };
    }
    const eh = parseInt(parts[0]) || 0;
    const em = parseInt(parts[1]) || 0;
    const es = parseInt(parts[2]) || 0;
    const episodeSec = eh * 3600 + em * 60 + es;
    const topFreeSec = Math.floor((1800 - episodeSec) / 2);
    const currentSecInSlot = (now.getMinutes() % 30) * 60 + now.getSeconds();
    const topFreeFrac = topFreeSec / 1800;
    const episodeFrac = episodeSec / 1800;
    const rawFrac = currentSecInSlot / 1800;
    const clampedFrac = Math.max(topFreeFrac, Math.min(topFreeFrac + episodeFrac, rawFrac));

    return { left: offset, width, top: `${clampedFrac * 100}%` };
  }

  getTipoDinamico(bloco: BlocoOutput, dia: string): string {
    const original = bloco.aTipoBlocoDesc ?? '';
    if (original.includes('Maratona') || original.includes('Especial')) return original;

    if (!bloco.aPrograma) return original || 'Inédito';

    const programaId = bloco.aPrograma.aId;
    const eps = this.allEpisodiosMap.get(programaId);
    if (!eps || eps.length === 0) return original || 'Inédito';

    const diasQuePassa = this.diasProgramaMap.get(programaId);
    if (!diasQuePassa || diasQuePassa.length === 0) return original || 'Inédito';

    const diaIdx = this.dias.indexOf(dia);
    const dayPosition = diasQuePassa.indexOf(diaIdx);
    if (dayPosition < 0) return original || 'Inédito';

    const epThis = this.getEpisodio(bloco, dia);

    if (this.isFimDeSemana(dia)) {
      const currentTime = bloco.aHorario?.substring(0, 5) ?? '';
      const mesmoDiaSameEp = this.filteredBlocos.some(b => {
        if (b.aId === bloco.aId) return false;
        if (b.aPrograma?.aId !== programaId) return false;
        if (b.aDiaSemanaDesc !== dia) return false;
        if ((b.aHorario?.substring(0, 5) ?? '') >= currentTime) return false;
        const epB = this.getEpisodio(b, dia);
        return epB && epThis && epB.aId === epThis.aId;
      });
      if (mesmoDiaSameEp) return 'Reprise';

      const sameDayBlocos = this.filteredBlocos
        .filter(b => b.aPrograma?.aId === programaId && this.normalizeDia(b.aDiaSemanaDesc ?? '') === this.normalizeDia(dia))
        .sort((a, b) => (a.aHorario ?? '').localeCompare(b.aHorario ?? ''));
      const numSlots = sameDayBlocos.length;

      for (let p = 0; p < this.currentPage(); p++) {
        const pOffset = p * numSlots;
        for (let s = 0; s < numSlots; s++) {
          const prevIdx = (pOffset + s) % eps.length;
          if (epThis && eps[prevIdx]?.aId === epThis.aId) return 'Reprise';
        }
      }

      return 'Inédito';
    }

    const currentTime = bloco.aHorario?.substring(0, 5) ?? '';
    const mesmoDiaSameEp = this.filteredBlocos.some(b => {
      if (b.aId === bloco.aId) return false;
      if (b.aPrograma?.aId !== programaId) return false;
      if (b.aDiaSemanaDesc !== dia) return false;
      if ((b.aHorario?.substring(0, 5) ?? '') >= currentTime) return false;
      const epB = this.getEpisodio(b, dia);
      return epB && epThis && epB.aId === epThis.aId;
    });
    if (mesmoDiaSameEp) return 'Reprise';

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
