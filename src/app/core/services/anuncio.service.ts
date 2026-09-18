import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Anuncio {
  id: number;
  uuid: string;
  titulo: string;
  descricao: string;
  imageUrl: string;
  linkUrl: string;
  statusDesc: string;
  moeda: string;
  walletAddress: string;
  valorPago: number;
  txHash: string;
  posicao: number;
  largura: number;
  altura: number;
}

export interface CreateAnuncioPayload {
  titulo: string;
  descricao: string;
  imageUrl: string;
  linkUrl: string;
  moeda: string;
  walletAddress: string;
  txHash: string;
  posicao: number;
  largura: number;
  altura: number;
  valorPago: number;
}

@Injectable({ providedIn: 'root' })
export class AnuncioService {
  private http = inject(HttpClient);
  private baseUrl = environment.API_URL + '/api/v1/anuncio';

  listByPosition(posicao: number): Observable<Anuncio[]> {
    return this.http.get<Anuncio[]>(this.baseUrl, { params: { posicao: posicao.toString() } });
  }

  create(payload: CreateAnuncioPayload): Observable<{ uuid: string; message: string }> {
    return this.http.post<{ uuid: string; message: string }>(this.baseUrl, payload);
  }
}
