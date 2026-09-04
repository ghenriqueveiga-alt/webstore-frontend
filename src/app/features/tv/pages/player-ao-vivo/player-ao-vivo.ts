import { Component, signal, inject, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TvService, BlocoOutput, ProgramaDetalhe } from '../../services/tv.service';
import { PlayerService } from '../../../player/services/player.service';

interface EpisodioInfo {
  aId: number;
  aNumero: number | null;
  aTemporada: number | null;
  aParte: number | null;
  aTitulo: string | null;
  aDuracao?: string | null;
}

@Component({
  selector: 'app-player-ao-vivo',
  imports: [RouterLink],
  templateUrl: './player-ao-vivo.html',
  styleUrl: './player-ao-vivo.css',
})
export class PlayerAoVivo implements OnInit, OnDestroy {

  readonly tvService = inject(TvService);
  readonly playerService = inject(PlayerService);

  @ViewChild('videoPlayer') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('playerWrap') wrapRef!: ElementRef<HTMLDivElement>;

  readonly isPlaying = signal(true);
  readonly isMuted = signal(false);
  readonly volume = signal(1);
  readonly videoEnded = signal(false);

  private tuneInAt = 0;
  private liveBase = 0;
  private suppressSeekGuard = false;

  readonly loading = signal(true);
  readonly currentTime = signal(new Date());
  readonly currentBloco = signal<BlocoOutput | null>(null);
  readonly currentEpisodio = signal<EpisodioInfo | null>(null);
  readonly videoUrl = signal<string | null>(null);
  readonly seekSeconds = signal(0);
  readonly isReprise = signal(false);
  readonly waitSeconds = signal(0);
  readonly programaDetalhe = signal<ProgramaDetalhe | null>(null);
  readonly programaErro = signal(false);

  private programaCache = new Map<number, ProgramaDetalhe>();
  private lastDetalheProgramaId = 0;

  private _timerInterval: any;

  readonly dias = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

  private allEpisodiosMap = new Map<number, EpisodioInfo[]>();
  private blocos: BlocoOutput[] = [];

  private parseDurationSec(duracao: string | null): number {
    if (!duracao) return 0;
    const p = duracao.split(':');
    if (p.length !== 3) return 0;
    return (parseInt(p[0]) || 0) * 3600 + (parseInt(p[1]) || 0) * 60 + (parseInt(p[2]) || 0);
  }

  private isMultiBloco(ep: EpisodioInfo | null): boolean {
    if (!ep) return false;
    const sec = this.parseDurationSec(ep.aDuracao ?? null);
    if (sec <= 30 * 60) return false;
    return this.countConsecutiveBlocosForProgram() > 1;
  }

  private countConsecutiveBlocosForProgram(): number {
    const bloco = this.currentBloco();
    if (!bloco?.aPrograma) return 1;
    const now = this.currentTime();
    const dayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const dia = this.dias[dayIdx];
    const sameDay = this.blocos
      .filter(b => b.aDiaSemanaDesc === dia && b.aPrograma?.aId === bloco.aPrograma!.aId && b.aHorario)
      .sort((a, b) => (a.aHorario ?? '').localeCompare(b.aHorario ?? ''));
    const idx = sameDay.findIndex(b => b.aId === bloco.aId);
    if (idx < 0) return 1;
    let count = 1;
    for (let j = idx + 1; j < sameDay.length; j++) {
      if (sameDay[j].aPrograma?.aId === bloco.aPrograma!.aId) count++;
      else break;
    }
    for (let j = idx - 1; j >= 0; j--) {
      if (sameDay[j].aPrograma?.aId === bloco.aPrograma!.aId) count++;
      else break;
    }
    return count;
  }

  private slotsForEpisode(ep: EpisodioInfo): number {
    const sec = this.parseDurationSec(ep.aDuracao ?? null);
    return Math.max(1, Math.ceil(sec / (30 * 60)));
  }

  private slotIndex(): number {
    if (!this.isMultiBloco(this.currentEpisodio())) return 0;
    const bloco = this.currentBloco();
    if (!bloco?.aPrograma) return 0;
    const now = this.currentTime();
    const dayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const dia = this.dias[dayIdx];
    const sameDay = this.blocos
      .filter(b => b.aDiaSemanaDesc === dia && b.aPrograma?.aId === bloco.aPrograma!.aId && b.aHorario)
      .sort((a, b) => (a.aHorario ?? '').localeCompare(b.aHorario ?? ''));
    const idx = sameDay.findIndex(b => b.aId === bloco.aId);
    if (idx < 0) return 0;
    let pos = 0;
    for (let j = idx - 1; j >= 0; j--) {
      if (sameDay[j].aPrograma?.aId === bloco.aPrograma!.aId) pos++;
      else break;
    }
    return pos;
  }

  private getTopFreeSeconds(): number {
    const ep = this.currentEpisodio();
    if (!ep) return 0;
    if (this.isMultiBloco(ep)) {
      if (this.slotIndex() !== 0) return 0;
      const totalSec = this.parseDurationSec(ep.aDuracao ?? null);
      const slots = this.slotsForEpisode(ep);
      const totalSlotSec = slots * 30 * 60;
      const livre = Math.max(0, totalSlotSec - totalSec);
      return Math.floor(livre / 2);
    }
    const sec = this.parseDurationSec(ep.aDuracao ?? null);
    const livre = 30 * 60 - sec;
    if (livre <= 0) return 0;
    return Math.floor(livre / 2);
  }

  ngOnInit(): void {
    this._timerInterval = setInterval(() => {
      this.currentTime.set(new Date());
      this.updateCurrentBloco();
    }, 1000);

    this.loadBlocos();
  }

  ngOnDestroy(): void {
    if (this._timerInterval) clearInterval(this._timerInterval);
  }

  private loadBlocos(): void {
    this.loading.set(true);
    this.tvService.listBlocos(0, 10000).subscribe({
      next: (res) => {
        this.blocos = res.aBlocos;
        const programIds = [...new Set(res.aBlocos.filter(b => b.aPrograma).map(b => b.aPrograma!.aId))];

        if (programIds.length === 0) {
          this.loading.set(false);
          return;
        }

        this.tvService.listPrimeirosEpisodiosPorPrograma(programIds, 30).subscribe({
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

            this.loading.set(false);
            this.updateCurrentBloco();
          },
          error: () => {
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.blocos = [];
        this.loading.set(false);
      },
    });
  }

  private updateCurrentBloco(): void {
    const now = this.currentTime();
    const dayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const dia = this.dias[dayIdx];
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    const currentTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    const matching = this.blocos.filter(b =>
      b.aDiaSemanaDesc === dia && b.aHorario && b.aHorario.substring(0, 5) <= currentTime.substring(0, 5)
    );

    if (matching.length === 0) {
      this.currentBloco.set(null);
      this.currentEpisodio.set(null);
      this.videoUrl.set(null);
      this.videoEnded.set(false);
      this.lastDetalheProgramaId = 0;
      this.programaDetalhe.set(null);
      return;
    }

    matching.sort((a, b) => (b.aHorario ?? '').localeCompare(a.aHorario ?? ''));
    const bloco = matching[0];

    if (this.currentBloco()?.aId === bloco.aId && this.currentBloco()?.aHorario === bloco.aHorario && this.videoUrl()) return;

    this.currentBloco.set(bloco);

    if (bloco.aPrograma) {
      this.loadProgramaDetalhe(bloco.aPrograma.aId);
    }

    const blocoStart = bloco.aHorario!.substring(0, 5);
    const [bh, bm] = blocoStart.split(':').map(Number);
    const blocoTotalSeconds = bh * 3600 + bm * 60;
    const currentTotalSeconds = h * 3600 + m * 60 + s;
    const elapsedSeconds = currentTotalSeconds - blocoTotalSeconds;

    const nowIdx = this.dias.indexOf(dia);
    const eps = bloco.aPrograma ? this.allEpisodiosMap.get(bloco.aPrograma.aId) : null;
    if (eps && eps.length > 0) {
      const idx = nowIdx % eps.length;
      this.currentEpisodio.set(eps[idx]);
    } else {
      this.currentEpisodio.set(null);
    }

    const topFree = this.getTopFreeSeconds();
    const adjustedSeek = elapsedSeconds - topFree;
    this.seekSeconds.set(adjustedSeek > 0 ? adjustedSeek : 0);

    if (adjustedSeek < 0) {
      this.waitSeconds.set(Math.abs(adjustedSeek));
      this.videoUrl.set(null);
      this.videoEnded.set(false);
      return;
    }

    this.waitSeconds.set(0);

    const primeiroHorario = this.findFirstBlocoForProgram(bloco.aPrograma?.aId ?? 0, dia);
    this.isReprise.set(primeiroHorario !== bloco.aHorario?.substring(0, 5));

    if (bloco.aPrograma) {
      this.loadVideo(bloco.aPrograma.aId, nowIdx);
    }
  }

  private loadProgramaDetalhe(programaId: number): void {
    if (programaId === this.lastDetalheProgramaId) return;
    this.lastDetalheProgramaId = programaId;
    const cached = this.programaCache.get(programaId);
    if (cached) {
      this.programaDetalhe.set(cached);
      return;
    }
    this.programaDetalhe.set(null);
    this.programaErro.set(false);
    this.tvService.getPrograma(programaId).subscribe({
      next: (d) => {
        this.programaCache.set(programaId, d);
        if (this.lastDetalheProgramaId === programaId) this.programaDetalhe.set(d);
      },
      error: () => {
        if (this.lastDetalheProgramaId === programaId) {
          this.programaDetalhe.set(null);
          this.programaErro.set(true);
        }
      },
    });
  }

  private loadVideo(programaId: number, dayIdx: number): void {
    const eps = this.allEpisodiosMap.get(programaId);
    if (!eps || eps.length === 0) return;

    const idx = dayIdx % eps.length;
    const ep = eps[idx];

    this.videoUrl.set(null);

    this.playerService.getEpisodio(ep.aId).subscribe({
      next: (fullEp) => {
        if (fullEp.aArquivo) {
          this.videoUrl.set(this.playerService.streamUrl(fullEp.aArquivo.aId));
        }
      },
      error: () => {
        setTimeout(() => this.loadVideo(programaId, dayIdx), 3000);
      },
    });
  }

  private findFirstBlocoForProgram(programaId: number, dia: string): string | null {
    const blocos = this.blocos
      .filter(b => b.aPrograma?.aId === programaId && b.aDiaSemanaDesc === dia && b.aHorario)
      .map(b => b.aHorario!.substring(0, 5))
      .sort();
    return blocos.length > 0 ? blocos[0] : null;
  }

  onVideoLoaded(): void {
    const video = this.videoRef?.nativeElement;
    if (video) {
      this.videoEnded.set(false);
      this.suppressSeekGuard = true;
      this.liveBase = this.seekSeconds();
      this.tuneInAt = Date.now();
      video.currentTime = this.seekSeconds();
      video.muted = this.isMuted();
      video.volume = this.volume();
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => {
          video.muted = true;
          this.isMuted.set(true);
          video.play().catch(() => {});
        });
      }
      setTimeout(() => (this.suppressSeekGuard = false), 500);
    }
  }

  private liveEdge(): number {
    const video = this.videoRef?.nativeElement;
    const elapsed = (Date.now() - this.tuneInAt) / 1000;
    let edge = this.liveBase + Math.max(0, elapsed);
    if (video && isFinite(video.duration) && video.duration > 0) {
      edge = Math.min(edge, video.duration);
    }
    return Math.max(0, edge);
  }

  onSeeking(): void {
    const video = this.videoRef?.nativeElement;
    if (!video || this.suppressSeekGuard || !this.tuneInAt) return;
    const edge = this.liveEdge();
    if (Math.abs(video.currentTime - edge) > 2) {
      this.suppressSeekGuard = true;
      try {
        video.currentTime = edge;
      } catch {}
      setTimeout(() => (this.suppressSeekGuard = false), 400);
    }
  }

  onPlayState(playing: boolean): void {
    this.isPlaying.set(playing);
    if (playing) {
      const video = this.videoRef?.nativeElement;
      if (video && this.tuneInAt && !this.suppressSeekGuard) {
        const edge = this.liveEdge();
        if (edge - video.currentTime > 2) {
          this.suppressSeekGuard = true;
          try {
            video.currentTime = edge;
          } catch {}
          setTimeout(() => (this.suppressSeekGuard = false), 400);
        }
      }
    }
  }

  onVideoEnded(): void {
    this.videoEnded.set(true);
    this.isPlaying.set(false);
  }

  get freeCountdownSec(): number {
    const now = this.currentTime();
    const intoSlot = (now.getMinutes() % 30) * 60 + now.getSeconds();
    return Math.max(0, 30 * 60 - intoSlot);
  }

  togglePlay(): void {
    const video = this.videoRef?.nativeElement;
    if (!video || video.ended) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  toggleMute(): void {
    const video = this.videoRef?.nativeElement;
    const muted = !this.isMuted();
    this.isMuted.set(muted);
    if (video) video.muted = muted;
  }

  onVolumeInput(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.volume.set(value);
    const video = this.videoRef?.nativeElement;
    if (video) {
      video.volume = value;
      if (value > 0 && this.isMuted()) {
        this.isMuted.set(false);
        video.muted = false;
      }
    }
  }

  toggleFullscreen(): void {
    const el = this.wrapRef?.nativeElement;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  }

  get liveElapsed(): number {
    const bloco = this.currentBloco();
    if (!bloco?.aHorario) return 0;
    const now = this.currentTime();
    const [bh, bm] = bloco.aHorario.substring(0, 5).split(':').map(Number);
    return Math.max(0, now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() - (bh * 3600 + bm * 60));
  }

  get nowTimeFormatted(): string {
    const now = this.currentTime();
    return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0');
  }

  get currentGradeName(): string {
    return this.currentBloco()?.aGrade?.aNome ?? '';
  }

  get capaUrl(): string | null {
    return this.programaDetalhe()?.aCapaUrl ?? this.currentBloco()?.aPrograma?.aCapaUrl ?? null;
  }

  get currentFaixa(): string {
    const h = this.currentTime().getHours();
    if (h < 6) return 'Madrugada';
    if (h < 12) return 'Manhã';
    if (h < 18) return 'Tarde';
    if (h < 22) return 'Noite';
    return 'Prime Time';
  }

  classificacaoBadgeClass(desc: string | null | undefined): string {
    if (!desc) return 'bg-gray-600 text-white';
    if (desc.includes('18')) return 'bg-black text-white border border-red-600';
    if (desc.includes('16')) return 'bg-red-600 text-white';
    if (desc.includes('14')) return 'bg-orange-500 text-white';
    if (desc.includes('12')) return 'bg-yellow-400 text-black';
    if (desc.includes('10')) return 'bg-blue-500 text-white';
    return 'bg-green-600 text-white';
  }

  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  get upcomingBlocos(): BlocoOutput[] {
    const now = this.currentTime();
    const dayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const dia = this.dias[dayIdx];
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    const currentTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    const gradeId = this.currentBloco()?.aGrade?.aId;

    return this.blocos
      .filter(b =>
        b.aDiaSemanaDesc === dia &&
        b.aHorario &&
        b.aHorario.substring(0, 5) >= currentTime.substring(0, 5) &&
        (!gradeId || b.aGrade?.aId === gradeId)
      )
      .sort((a, b) => (a.aHorario ?? '').localeCompare(b.aHorario ?? ''))
      .slice(0, 8);
  }

  get nextBloco(): BlocoOutput | null {
    const cur = this.currentBloco();
    const list = this.upcomingBlocos.filter(b => b.aId !== cur?.aId);
    return list.length > 0 ? list[0] : null;
  }
}
