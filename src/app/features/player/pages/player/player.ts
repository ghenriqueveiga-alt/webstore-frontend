import { Component, signal, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PlayerService, EpisodioOutput, CorteTempoOutput, ArquivoOutput } from '../../services/player.service';

@Component({
  selector: 'app-player',
  imports: [],
  templateUrl: './player.html',
  styleUrl: './player.css',
})
export class Player implements OnInit {

  readonly playerService = inject(PlayerService);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('videoPlayer') videoRef!: ElementRef<HTMLVideoElement>;

  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly uploading = signal(false);
  readonly uploadSuccess = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly arquivoId = signal<number | null>(null);
  readonly videoUrl = signal<string | null>(null);
  readonly fileName = signal('');
  readonly pendingSeek = signal<number | null>(null);

  readonly episodios = signal<EpisodioOutput[]>([]);
  readonly episodiosPage = signal(0);
  readonly episodiosTotal = signal(0);
  readonly episodiosPerPage = 20;
  readonly searchText = signal('');
  readonly loadingEpisodios = signal(false);

  readonly selectedEpisodio = signal<EpisodioOutput | null>(null);
  readonly cortesTempo = signal<CorteTempoOutput[]>([]);
  readonly loadingCortes = signal(false);
  private videoReady = false;

  readonly corteTypes = [
    { code: 'AB', label: 'Abertura' },
    { code: 'EN', label: 'Encerramento' },
    { code: 'CO', label: 'Comercial' },
    { code: 'IN', label: 'Introdução' },
    { code: 'TI', label: 'Título' },
    { code: 'P1', label: 'Parte 1' },
    { code: 'P2', label: 'Parte 2' },
    { code: 'VI', label: 'Vinheta Ida' },
    { code: 'VV', label: 'Vinheta Volta' },
    { code: 'PP', label: 'Prévia' },
    { code: 'VC', label: 'Vinheta Canal' },
    { code: 'MI', label: 'Maratona' },
  ];
  readonly selectedCorteType = signal('AB');
  readonly addingCorte = signal(false);
  readonly addCorteError = signal<string | null>(null);
  readonly pausedAt = signal<number | null>(null);
  readonly corteInicio = signal<number | null>(null);

  ngOnInit(): void {
    const episodioId = this.route.snapshot.queryParamMap.get('episodio');
    this.loadEpisodios(episodioId ? +episodioId : null);
  }

  loadEpisodios(autoSelectId: number | null = null): void {
    this.loadingEpisodios.set(true);
    this.playerService.listEpisodios(this.episodiosPage(), this.episodiosPerPage, this.searchText()).subscribe({
      next: (res) => {
        this.episodios.set(res.aEpisodios);
        this.episodiosTotal.set(res.aTotal);
        this.loadingEpisodios.set(false);

        if (autoSelectId !== null) {
          const found = res.aEpisodios.find(ep => ep.aId === autoSelectId);
          if (found) {
            this.selectEpisodio(found);
          } else {
            this.playerService.getEpisodio(autoSelectId).subscribe({
              next: (ep) => this.selectEpisodio(ep),
            });
          }
        }
      },
      error: () => {
        this.episodios.set([]);
        this.loadingEpisodios.set(false);
      },
    });
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
    this.episodiosPage.set(0);
    this.loadEpisodios();
  }

  prevEpisodiosPage(): void {
    if (this.episodiosPage() > 0) {
      this.episodiosPage.update(p => p - 1);
      this.loadEpisodios();
    }
  }

  nextEpisodiosPage(): void {
    const maxPage = Math.ceil(this.episodiosTotal() / this.episodiosPerPage) - 1;
    if (this.episodiosPage() < maxPage) {
      this.episodiosPage.update(p => p + 1);
      this.loadEpisodios();
    }
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.episodiosTotalPages && page !== this.episodiosPage()) {
      this.episodiosPage.set(page);
      this.loadEpisodios();
    }
  }

  get visiblePages(): number[] {
    const total = this.episodiosTotalPages;
    const current = this.episodiosPage();
    const maxVisible = 5;

    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i);
    }

    let start = Math.max(0, current - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;

    if (end >= total) {
      end = total - 1;
      start = Math.max(0, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  get episodiosTotalPages(): number {
    return Math.ceil(this.episodiosTotal() / this.episodiosPerPage);
  }

  selectEpisodio(ep: EpisodioOutput): void {
    this.selectedEpisodio.set(ep);
    this.loadingCortes.set(true);
    this.cortesTempo.set([]);
    this.pendingSeek.set(null);
    this.pausedAt.set(null);
    this.corteInicio.set(null);
    this.videoReady = false;

    if (ep.aArquivo) {
      this.videoUrl.set(this.playerService.streamUrl(ep.aArquivo.aId));
      this.fileName.set(ep.aArquivo.aNome ?? ep.aTitulo ?? '');
    } else {
      this.videoUrl.set(null);
    }

    this.playerService.getCortesTempo(ep.aId).subscribe({
      next: (res) => {
        this.cortesTempo.set(res.aCortes);
        this.loadingCortes.set(false);
      },
      error: () => {
        this.cortesTempo.set([]);
        this.loadingCortes.set(false);
      },
    });
  }

  backToEpisodios(): void {
    this.selectedEpisodio.set(null);
    this.cortesTempo.set([]);
    this.videoUrl.set(null);
    this.pendingSeek.set(null);
    this.pausedAt.set(null);
    this.corteInicio.set(null);
    this.loadEpisodios();
  }

  onVideoLoaded(): void {
    const seek = this.pendingSeek();
    if (seek !== null) {
      this.seekTo(seek);
      this.pendingSeek.set(null);
      this.videoReady = true;
    } else if (!this.videoReady) {
      this.videoReady = true;
      const video = this.videoRef?.nativeElement;
      if (video) video.play().catch(() => {});
    }
  }

  playFromCorte(corte: CorteTempoOutput): void {
    const video = this.videoRef?.nativeElement;
    if (!video) {
      this.pendingSeek.set(corte.aInicioSegundos);
      return;
    }
    video.currentTime = corte.aInicioSegundos;
    video.play().catch(() => {});
  }

  stopCorte(): void {
    const video = this.videoRef?.nativeElement;
    if (video) video.pause();
  }

  onVideoPaused(): void {
    const video = this.videoRef?.nativeElement;
    if (video) this.pausedAt.set(Math.floor(video.currentTime));
  }

  private seekTo(seconds: number): void {
    const video = this.videoRef?.nativeElement;
    if (!video) return;
    video.currentTime = seconds;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (file) {
      this.selectedFile.set(file);
      this.fileName.set(file.name);
      this.uploadSuccess.set(false);
      this.uploadError.set(null);
      this.arquivoId.set(null);

      if (this.previewUrl()) URL.revokeObjectURL(this.previewUrl()!);
      this.previewUrl.set(URL.createObjectURL(file));
    }
  }

  upload(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.uploading.set(true);
    this.uploadError.set(null);

    this.playerService.upload(file).subscribe({
      next: (res: ArquivoOutput) => {
        this.uploading.set(false);
        this.uploadSuccess.set(true);
        this.arquivoId.set(res.aId);
        this.videoUrl.set(this.playerService.streamUrl(res.aId));
      },
      error: (err: { error?: { message?: string } }) => {
        this.uploading.set(false);
        this.uploadError.set(err.error?.message ?? 'Erro ao fazer upload.');
      },
    });
  }

  clearUpload(): void {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.uploadSuccess.set(false);
    this.uploadError.set(null);
    this.arquivoId.set(null);
  }

  startCorte(): void {
    const video = this.videoRef?.nativeElement;
    if (!video) return;
    const now = Math.floor(video.currentTime);
    this.corteInicio.set(now);
    this.pausedAt.set(now);
    video.pause();
  }

  finishCorte(): void {
    const ep = this.selectedEpisodio();
    const video = this.videoRef?.nativeElement;
    const inicio = this.corteInicio();
    if (!ep?.aArquivo || !video || inicio === null) return;

    this.addingCorte.set(true);
    this.addCorteError.set(null);

    const fim = Math.floor(video.currentTime);
    if (fim <= inicio) {
      this.addingCorte.set(false);
      this.addCorteError.set('Fim deve ser posterior ao início.');
      return;
    }

    this.playerService.createCorte({
      aArquivoId: ep.aArquivo.aId,
      aTipoCode: this.selectedCorteType(),
      aDuracao: this.formatSeconds(fim - inicio),
      aEpisodioId: ep.aId,
      aInicio: this.secondsToTime(inicio),
      aFim: this.secondsToTime(fim),
    }).subscribe({
      next: () => {
        this.addingCorte.set(false);
        this.corteInicio.set(null);
        this.playerService.getCortesTempo(ep.aId).subscribe({
          next: (res) => this.cortesTempo.set(res.aCortes),
        });
      },
      error: (err) => {
        this.addingCorte.set(false);
        this.addCorteError.set(err.error?.message ?? 'Erro ao criar corte.');
      },
    });
  }

  cancelCorte(): void {
    this.corteInicio.set(null);
    this.addCorteError.set(null);
  }

  deleteCorte(corteId: number): void {
    const ep = this.selectedEpisodio();
    if (!ep) return;

    this.playerService.deleteCorte(corteId).subscribe({
      next: () => {
        this.playerService.getCortesTempo(ep.aId).subscribe({
          next: (res) => this.cortesTempo.set(res.aCortes),
        });
      },
    });
  }

  private secondsToTime(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  clearAll(): void {
    this.videoUrl.set(null);
    this.arquivoId.set(null);
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.uploadSuccess.set(false);
    this.fileName.set('');
    this.selectedEpisodio.set(null);
    this.cortesTempo.set([]);
    this.pendingSeek.set(null);
    this.pausedAt.set(null);
    this.corteInicio.set(null);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  formatSeconds(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
