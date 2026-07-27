import { Component, inject, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AccountService } from '../../../../core/services/account.service';

@Component({
  selector: 'app-order-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './order-detail.html',
})
export class OrderDetail {
  private route = inject(ActivatedRoute);
  private account = inject(AccountService);

  readonly order = computed(() => {
    const id = this.route.snapshot.paramMap.get('id');
    return this.account.orders().find(o => o.orderNumber === id) ?? null;
  });

  statusLabel(s: string): string {
    const map: Record<string, string> = {
      confirmed: 'Confirmado', preparing: 'Separando', shipped: 'Enviado',
      in_transit: 'Em Trânsito', out_for_delivery: 'Saiu para Entrega',
      delivered: 'Entregue', cancelled: 'Cancelado',
    };
    return map[s] ?? s;
  }

  statusColor(s: string): string {
    const map: Record<string, string> = {
      confirmed: 'bg-blue-100 text-blue-700', preparing: 'bg-indigo-100 text-indigo-700',
      shipped: 'bg-yellow-100 text-yellow-700', in_transit: 'bg-orange-100 text-orange-700',
      out_for_delivery: 'bg-purple-100 text-purple-700',
      delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
    };
    return map[s] ?? 'bg-gray-100 text-gray-700';
  }

  paymentLabel(m: string): string {
    const map: Record<string, string> = { credit: 'Cartão de Crédito', boleto: 'Boleto Bancário', pix: 'PIX' };
    return map[m] ?? m;
  }

  trackingDone(index: number): boolean {
    const t = this.order()?.tracking;
    if (!t) return false;
    if (this.order()?.status === 'cancelled') return index <= t.findIndex(e => e.status === 'cancelled');
    return t[index]?.status !== this.order()?.status ? true : false;
  }

  isLastDone(index: number): boolean {
    const t = this.order()?.tracking;
    if (!t) return false;
    return this.trackingDone(index) || (t[index]?.status === this.order()?.status);
  }
}
