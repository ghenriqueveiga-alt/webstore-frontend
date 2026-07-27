import { computed, Injectable, signal } from '@angular/core';
import type { AddressData } from '../../features/checkout/checkout.model';

export interface SavedCard {
  id: number;
  cardNumber: string;
  cardName: string;
  expiry: string;
  lastDigits: string;
  brand: string;
}

export interface TrackingEvent {
  status: string;
  date: Date;
  label: string;
  description: string;
}

export interface OrderEntry {
  orderNumber: string;
  date: Date;
  items: { name: string; quantity: number; price: number; image: string }[];
  total: number;
  address: AddressData;
  payment: { method: string; lastDigits?: string };
  status: 'confirmed' | 'preparing' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'cancelled';
  tracking?: TrackingEvent[];
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  readonly addresses = signal<AddressData[]>([]);
  readonly cards = signal<SavedCard[]>([]);
  readonly orders = signal<OrderEntry[]>([]);

  readonly addressCount = computed(() => this.addresses().length);
  readonly cardCount = computed(() => this.cards().length);
  readonly orderCount = computed(() => this.orders().length);

  private nextCardId = 1;

  addAddress(a: AddressData): void {
    this.addresses.update(list => [...list, a]);
  }

  removeAddress(index: number): void {
    this.addresses.update(list => list.filter((_, i) => i !== index));
  }

  updateAddress(index: number, a: AddressData): void {
    this.addresses.update(list => list.map((item, i) => i === index ? a : item));
  }

  addCard(card: Omit<SavedCard, 'id' | 'lastDigits'>): void {
    const last = card.cardNumber.slice(-4);
    this.cards.update(list => [...list, { ...card, id: this.nextCardId++, lastDigits: last }]);
  }

  removeCard(id: number): void {
    this.cards.update(list => list.filter(c => c.id !== id));
  }

  addOrder(order: OrderEntry): void {
    const now = new Date();
    const tracking: TrackingEvent[] = [
      { status: 'confirmed', date: now, label: 'Pedido Confirmado', description: 'Seu pedido foi recebido e está sendo processado.' },
    ];
    this.orders.update(list => [{ ...order, tracking }, ...list]);
  }

  advanceOrder(orderNumber: string): void {
    this.orders.update(list => list.map(o => {
      if (o.orderNumber !== orderNumber) return o;
      if (o.status === 'cancelled' || o.status === 'delivered') return o;
      const nextMap: Record<string, { status: OrderEntry['status']; label: string; description: string }> = {
        confirmed: { status: 'preparing', label: 'Separando Estoque', description: 'Seus itens estão sendo separados no nosso centro de distribuição.' },
        preparing: { status: 'shipped', label: 'Pedido Enviado', description: 'O pedido saiu para transporte e está a caminho.' },
        shipped: { status: 'in_transit', label: 'Em Trânsito', description: 'O pedido está em trânsito para o centro de distribuição mais próximo.' },
        in_transit: { status: 'out_for_delivery', label: 'Saiu para Entrega', description: 'O pedido está com o entregador e será entregue hoje.' },
        out_for_delivery: { status: 'delivered', label: 'Entregue', description: 'Pedido entregue com sucesso!' },
      };
      const next = nextMap[o.status];
      if (!next) return o;
      return {
        ...o,
        status: next.status,
        tracking: [...(o.tracking ?? []), { status: next.status, date: new Date(), label: next.label, description: next.description }],
      };
    }));
  }

  cancelOrder(orderNumber: string): void {
    this.orders.update(list => list.map(o => {
      if (o.orderNumber !== orderNumber) return o;
      if (o.status === 'delivered') return o;
      return {
        ...o,
        status: 'cancelled',
        tracking: [...(o.tracking ?? []), { status: 'cancelled', date: new Date(), label: 'Cancelado', description: 'O pedido foi cancelado.' }],
      };
    }));
  }
}
