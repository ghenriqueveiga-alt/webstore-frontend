import { Component, Input, AfterViewInit, ElementRef, inject, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-google-ad',
  imports: [],
  templateUrl: './google-ad.html',
  styleUrl: './google-ad.css',
})
export class GoogleAd implements AfterViewInit {

  @Input() adClient = '';
  @Input() adSlot = '';
  @Input() label = 'Anúncio';

  readonly configured = signal(false);
  readonly environment = environment;
  private readonly host = inject(ElementRef);

  ngAfterViewInit(): void {
    const client = this.adClient || environment.adsense.publisherId;
    const slot = this.adSlot || environment.adsense.slotSideRail;
    if (!client || !slot) return;
    this.configured.set(true);
    this.loadScript(client);
  }

  private loadScript(client: string): void {
    const el = this.host.nativeElement as HTMLElement;
    const doc = el.ownerDocument;
    if (!doc.querySelector('script[data-adsbygoogle]')) {
      const s = doc.createElement('script');
      s.async = true;
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
      s.crossOrigin = 'anonymous';
      s.setAttribute('data-adsbygoogle', 'true');
      doc.head.appendChild(s);
    }
    try {
      const w = window as unknown as { adsbygoogle: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      /* adblock ou render fora do browser: mantém o placeholder */
    }
  }
}
