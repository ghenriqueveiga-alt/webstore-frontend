import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ArquivoOutput {
  aId: number;
  aUuid: string;
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
  aCapaUrl: string | null;
  aTemporadas: number | null;
  aGeneros: { aId: number; aNome: string }[] | null;
}

export interface EpisodioOutput {
  aId: number;
  aUuid: string;
  aStatusCode: string;
  aArquivo: ArquivoOutput | null;
  aTitulo: string | null;
  aNumero: number | null;
  aTemporada: number | null;
  aParte: number | null;
  aCapaUrl: string | null;
  aPrograma: { aId: number; aUuid: string; aNome: string } | null;
  aProcessado: boolean | null;
}

export interface PaginatedProgramas {
  aCurrentPage: number;
  aPerPage: number;
  aTotal: number;
  aProgramas: ProgramaOutput[];
}

export interface PaginatedEpisodios {
  aCurrentPage: number;
  aPerPage: number;
  aTotal: number;
  aEpisodios: EpisodioOutput[];
}

export interface BlocoOutput {
  aId: number;
  aUuid: string;
  aStatusCode: string;
  aPrograma: { aId: number; aUuid: string; aNome: string; aCapaUrl: string | null } | null;
  aHorario: string | null;
  aGrade: { aId: number; aUuid: string; aNome: string } | null;
  aDiaSemanaDesc: string | null;
  aFaixaHorarioDesc: string | null;
  aTipoBlocoDesc: string | null;
}

export interface GradeOutput {
  aId: number;
  aUuid: string;
  aNome: string;
  aDescricao: string | null;
  aPeriodoInicio: string | null;
  aPeriodoFim: string | null;
  aGradeAtiva: boolean | null;
}

export interface PaginatedBlocos {
  aCurrentPage: number;
  aPerPage: number;
  aTotal: number;
  aBlocos: BlocoOutput[];
}

export interface PaginatedGrades {
  aCurrentPage: number;
  aPerPage: number;
  aTotal: number;
  aGrades: GradeOutput[];
}

@Injectable({ providedIn: 'root' })
export class TvService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1';

  listProgramas(page: number, size: number, search: string = ''): Observable<PaginatedProgramas> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'nome')
      .set('direction', 'asc');
    if (search) params = params.set('search', search);
    return this.http.get<PaginatedProgramas>(`${this.baseUrl}/programa`, { params });
  }

  listEpisodios(page: number, size: number, programaId?: number, search: string = ''): Observable<PaginatedEpisodios> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'temporada')
      .set('direction', 'asc');
    if (programaId) params = params.set('programaId', programaId.toString());
    if (search) params = params.set('search', search);
    return this.http.get<PaginatedEpisodios>(`${this.baseUrl}/episodio`, { params });
  }

  listEpisodiosByProgramaIds(programaIds: number[]): Observable<PaginatedEpisodios> {
    const params = new HttpParams()
      .set('page', '0')
      .set('size', '10000')
      .set('sort', 'id')
      .set('direction', 'asc')
      .set('programaIds', programaIds.join(','));
    return this.http.get<PaginatedEpisodios>(`${this.baseUrl}/episodio`, { params });
  }

  listFirstEpisodioByProgramaIds(programaIds: number[]): Observable<EpisodioOutput[]> {
    const params = new HttpParams().set('programaIds', programaIds.join(','));
    return this.http.get<EpisodioOutput[]>(`${this.baseUrl}/episodio/primeiro-por-programa`, { params });
  }

  listPrimeirosEpisodiosPorPrograma(programaIds: number[], limite: number = 1, offset: number = 0): Observable<{ aId: number; aNumero: number | null; aTemporada: number | null; aTitulo: string | null; aProgramaId: number; aParte: number | null; aDuracao: string | null }[]> {
    const params = new HttpParams()
      .set('programaIds', programaIds.join(','))
      .set('limite', limite.toString())
      .set('offset', offset.toString());
    return this.http.get<{ aId: number; aNumero: number | null; aTemporada: number | null; aTitulo: string | null; aProgramaId: number; aParte: number | null; aDuracao: string | null }[]>(`${this.baseUrl}/episodio/primeiros-por-programa`, { params });
  }

  streamUrl(id: number): string {
    return `${this.baseUrl}/arquivo/${id}/stream`;
  }

  capaEpisodioUrl(episodioId: number): string {
    return `${this.baseUrl}/episodio/${episodioId}/capa`;
  }

  listBlocos(page: number, size: number, gradeId?: number, search: string = ''): Observable<PaginatedBlocos> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'horario')
      .set('direction', 'asc');
    if (gradeId) params = params.set('gradeId', gradeId.toString());
    if (search) params = params.set('search', search);
    return this.http.get<PaginatedBlocos>(`${this.baseUrl}/bloco`, { params });
  }

  listGrades(page: number, size: number, search: string = ''): Observable<PaginatedGrades> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'id')
      .set('direction', 'asc');
    if (search) params = params.set('search', search);
    return this.http.get<PaginatedGrades>(`${this.baseUrl}/grade`, { params });
  }

  createBloco(data: { aProgramaId: number; aHorario: string; aGradeId: number; aDiaSemanaCode: string; aFaixaHorarioCode: string; aTipoBlocoCode: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/bloco`, data);
  }

  deleteBloco(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/bloco/id/${id}`);
  }
}
