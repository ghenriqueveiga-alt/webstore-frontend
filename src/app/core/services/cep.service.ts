import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CepService {
  private http = inject(HttpClient);

  buscar(cep: string): Observable<ViaCepResponse> {
    const digits = cep.replace(/\D/g, '');
    return this.http.get<ViaCepResponse>(`https://viacep.com.br/ws/${digits}/json/`);
  }
}
