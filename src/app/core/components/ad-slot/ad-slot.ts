import { Component, input, inject, OnInit, signal } from '@angular/core';
import { AnuncioService, Anuncio } from '../../services/anuncio.service';

@Component({
  selector: 'app-ad-slot',
  imports: [],
  templateUrl: './ad-slot.html',
  styleUrl: './ad-slot.css',
})
export class AdSlot implements OnInit {
  posicao = input.required<number>();

  private adService = inject(AnuncioService);
  readonly anuncio = signal<Anuncio | null>(null);

  ngOnInit() {
    this.adService.listByPosition(this.posicao()).subscribe({
      next: (ads) => {
        if (ads.length > 0) {
          const idx = Math.floor(Math.random() * ads.length);
          this.anuncio.set(ads[idx]);
        }
      },
      error: () => {},
    });
  }
}
