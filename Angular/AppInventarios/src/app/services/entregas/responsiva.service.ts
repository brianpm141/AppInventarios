import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment';

@Injectable({ providedIn: 'root' })
export class ResponsivaService {
  private apiUrl = `${environment.apiUrl}/api/responsivas`;

  constructor(private http: HttpClient) {}

  crearResponsiva(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, data);
  }

  previsualizarResponsiva(data: any): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/preview`, data, { responseType: 'blob' });
  }

  descargarPDF(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/pdf/${id}`, { responseType: 'blob' });
  }

  obtenerResponsivas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}`);
  }

  obtenerDetalleResponsiva(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  cancelarResponsiva(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  eliminarResponsiva(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete/${id}`);
  }

  // NUEVO: Subir documento a una responsiva
  subirDocumento(responsivaId: number, archivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post(`${this.apiUrl}/${responsivaId}/documento`, formData);
  }

  // NUEVO: Obtener documentos asociados
  obtenerDocumentos(responsivaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${responsivaId}/documentos`);
  }

  eliminarDocumento(responsivaId: number, docId: number): Observable<any> {
  return this.http.delete(`${this.apiUrl}/${responsivaId}/documentos/${docId}`);
}

}
