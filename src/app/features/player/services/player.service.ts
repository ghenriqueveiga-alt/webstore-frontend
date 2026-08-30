import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ArquivoOutput {
  aId: number;
  aUuid: string;
  aStatusCode: string;
  aNome: string;
  aTipo: string;
  aTamanho: number;
  aCaminho: string;
  aDuracao: string;
}

export interface ProgramaOutput {
  aId: number;
  aUuid: string;
  aNome: string;
}

export interface EpisodioOutput {
  aId: number;
  aUuid: string;
  aStatusCode: string;
  aArquivo: ArquivoOutput | null;
  aTitulo: string | null;
  aNumero: number | null;
  aTemporada: number | null;
  aCapaUrl: string | null;
  aPrograma: ProgramaOutput | null;
  aProcessado: boolean | null;
}

export interface CorteOutput {
  aId: number;
  aUuid: string;
  aStatusCode: string;
  aArquivo: ArquivoOutput | null;
  aTipoCode: string | null;
  aDuracao: string | null;
  episodio: EpisodioOutput | null;
}

export interface CorteTempoOutput {
  aId: number;
  aTipoCode: string;
  aTipoDesc: string;
  aDuracao: string;
  aInicioSegundos: number;
  aFimSegundos: number;
  aInicio: string;
  aFim: string;
  aPercentualInicio: number;
  aPercentualFim: number;
}

export interface PaginatedEpisodios {
  aCurrentPage: number;
  aPerPage: number;
  aTotal: number;
  aEpisodios: EpisodioOutput[];
}

export interface PaginatedCortes {
  aCurrentPage: number;
  aPerPage: number;
  aTotal: number;
  aCortes: CorteOutput[];
}

export interface CortesTempoResponse {
  aId: number;
  aTitulo: string;
  aDuracaoArquivo: string;
  aDuracaoRealVideo: string;
  aOrigemDuracao: string;
  aDuracaoTotalCortes: string;
  aCortes: CorteTempoOutput[];
}

@Injectable({ providedIn: 'root' })
export class PlayerService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1';

  streamUrl(id: number): string {
    return `${this.baseUrl}/arquivo/${id}/stream`;
  }

  capaEpisodioUrl(episodioId: number): string {
    return `${this.baseUrl}/episodio/${episodioId}/capa`;
  }

  upload(file: File, nome?: string, tipo?: string, duracao?: string): Observable<ArquivoOutput> {
    const formData = new FormData();
    formData.append('file', file);
    if (nome) formData.append('nome', nome);
    if (tipo) formData.append('tipo', tipo);
    if (duracao) formData.append('duracao', duracao);
    return this.http.post<ArquivoOutput>(`${this.baseUrl}/arquivo/upload`, formData);
  }

  listEpisodios(page: number, size: number, search: string = ''): Observable<PaginatedEpisodios> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'id')
      .set('direction', 'asc');
    if (search) params = params.set('search', search);
    return this.http.get<PaginatedEpisodios>(`${this.baseUrl}/episodio`, { params });
  }

  getEpisodio(id: number): Observable<EpisodioOutput> {
    return this.http.get<EpisodioOutput>(`${this.baseUrl}/episodio/id/${id}`);
  }

  listCortes(page: number, size: number, search: string = ''): Observable<PaginatedCortes> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'id')
      .set('direction', 'asc');
    if (search) params = params.set('search', search);
    return this.http.get<PaginatedCortes>(`${this.baseUrl}/corte`, { params });
  }

  getCortesTempo(episodioId: number): Observable<CortesTempoResponse> {
    return this.http.get<CortesTempoResponse>(`${this.baseUrl}/episodio/${episodioId}/cortes-tempo`);
  }

  createCorte(data: {
    aArquivoId: number;
    aTipoCode: string;
    aDuracao: string;
    aEpisodioId: number;
    aInicio: string;
    aFim: string;
  }): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/corte`, data);
  }

  deleteCorte(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/corte/id/${id}`);
  }
}
