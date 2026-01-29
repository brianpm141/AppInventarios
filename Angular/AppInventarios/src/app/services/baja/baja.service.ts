// src/app/services/bajas/baja.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment';

@Injectable({ providedIn: 'root' })
export class BajaService {
  private apiUrl = `${environment.apiUrl}/api/bajas`;
  private filesBase = `${environment.apiUrl}/uploads/bajas`;

  constructor(private http: HttpClient) {}

  obtenerBajas(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Si tu POST devuelve el PDF (como en tu back actual), deja Blob:
  registrarBaja(bajaData: any): Observable<Blob> {
    return this.http.post(`${this.apiUrl}`, bajaData, { responseType: 'blob' });
  }

  // (Opcional) Viejo detalle simple:
  obtenerBajaPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // === NUEVOS para el modal de detalle ===
  obtenerDetalle(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/detalle`);
  }

  obtenerDocumentos(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/documentos`);
  }

  subirDocumento(id: number, archivo: File): Observable<any> {
    const form = new FormData();
    form.append('archivo', archivo);
    return this.http.post(`${this.apiUrl}/${id}/documento`, form);
  }

  eliminarDocumento(id: number, docId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}/documentos/${docId}`);
  }

  // Descargar re-generado desde el servidor
  descargarPDF(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/pdf/${id}`, { responseType: 'blob' });
  }

  // URL directa para <a> o iframe de documentos subidos
  descargarDocumento(nombre: string): string {
    return `${this.apiUrl}/descargar/${nombre}`;
  }

  // Por si necesitas base para iframes: this.filesBase + '/' + ruta_archivo
  getFilesBase(): string {
    return this.filesBase;
  }

  eliminarBajaPorDeviceId(deviceId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/por-dispositivo/${deviceId}`);
  }
}
