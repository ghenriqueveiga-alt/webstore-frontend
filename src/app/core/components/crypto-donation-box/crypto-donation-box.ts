import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-crypto-donation-box',
  imports: [],
  templateUrl: './crypto-donation-box.html',
  styleUrl: './crypto-donation-box.css',
})
export class CryptoDonationBox {
  readonly copiedAddress = signal<string | null>(null);

  readonly wallets = [
    {
      coin: 'Bitcoin',
      symbol: 'BTC',
      address: 'SUA_WALLET_AQUI',
      color: '#f7931a',
      icon: '₿',
    },
    {
      coin: 'Ethereum',
      symbol: 'ETH',
      address: 'SUA_WALLET_AQUI',
      color: '#627eea',
      icon: 'Ξ',
    },
    {
      coin: 'Binance',
      symbol: 'BNB',
      address: 'SUA_WALLET_AQUI',
      color: '#f0b90b',
      icon: 'B',
    },
  ];

  getQrUrl(address: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(address)}`;
  }

  async copyAddress(address: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(address);
      this.copiedAddress.set(address);
      setTimeout(() => this.copiedAddress.set(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = address;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.copiedAddress.set(address);
      setTimeout(() => this.copiedAddress.set(null), 2000);
    }
  }
}
