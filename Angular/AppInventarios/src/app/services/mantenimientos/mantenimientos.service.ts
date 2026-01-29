import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment';

@Injectable({ providedIn: 'root' })
export class MantenimientoService {
  private apiUrl = `${environment.apiUrl}/api/mantenimientos`;

  constructor(private http: HttpClient) {}

  registrarMantenimiento(data: any): Observable<Blob> {
  return this.http.post(`${this.apiUrl}`, data, { responseType: 'blob' });
}

}
