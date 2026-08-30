import { Component, signal, inject, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TvService, BlocoOutput } from '../../services/tv.service';
import { PlayerService } from '../../../player/services/player.service';

interface EpisodioInfo {
  aId: number;
  aNumero: number | null;
  aTemporada: number | null;
  aParte: number | null;
  aTitulo: string | null;
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

  readonly loading = signal(true);
  readonly currentTime = signal(new Date());
  readonly currentBloco = signal<BlocoOutput | null>(null);
  readonly currentEpisodio = signal<EpisodioInfo | null>(null);
  readonly videoUrl = signal<string | null>(null);
  readonly seekSeconds = signal(0);
  readonly isReprise = signal(false);

  private _timerInterval: any;

  readonly dias = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

  private allEpisodiosMap = new Map<number, EpisodioInfo[]>();
  private blocos: BlocoOutput[] = [];

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
      return;
    }

    matching.sort((a, b) => (b.aHorario ?? '').localeCompare(a.aHorario ?? ''));
    const bloco = matching[0];

    if (this.currentBloco()?.aId === bloco.aId && this.currentBloco()?.aHorario === bloco.aHorario && this.videoUrl()) return;

    this.currentBloco.set(bloco);

    const blocoStart = bloco.aHorario!.substring(0, 5);
    const [bh, bm] = blocoStart.split(':').map(Number);
    const blocoTotalSeconds = bh * 3600 + bm * 60;
    const currentTotalSeconds = h * 3600 + m * 60 + s;
    const elapsedSeconds = currentTotalSeconds - blocoTotalSeconds;
    this.seekSeconds.set(elapsedSeconds > 0 ? elapsedSeconds : 0);

    const nowIdx = this.dias.indexOf(dia);
    const eps = bloco.aPrograma ? this.allEpisodiosMap.get(bloco.aPrograma.aId) : null;
    if (eps && eps.length > 0) {
      const idx = nowIdx % eps.length;
      this.currentEpisodio.set(eps[idx]);
    } else {
      this.currentEpisodio.set(null);
    }

    const primeiroHorario = this.findFirstBlocoForProgram(bloco.aPrograma?.aId ?? 0, dia);
    this.isReprise.set(primeiroHorario !== bloco.aHorario?.substring(0, 5));

    if (bloco.aPrograma) {
      this.loadVideo(bloco.aPrograma.aId, nowIdx);
    }
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
      video.currentTime = this.seekSeconds();
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    }
  }

  get nowTimeFormatted(): string {
    const now = this.currentTime();
    return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0');
  }

  get currentGradeName(): string {
    return this.currentBloco()?.aGrade?.aNome ?? '';
  }

  get currentFaixa(): string {
    const h = this.currentTime().getHours();
    if (h < 6) return 'Madrugada';
    if (h < 12) return 'Manhã';
    if (h < 18) return 'Tarde';
    if (h < 22) return 'Noite';
    return 'Prime Time';
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
}
