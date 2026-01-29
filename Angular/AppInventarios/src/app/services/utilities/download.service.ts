import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environment';

@Injectable({
  providedIn: 'root'
})
export class DownloadService {
  constructor(private http: HttpClient) {}

  private apiUrl = `${environment.apiUrl}`;

  descargarFormato(nombreArchivo: string) {
    return this.http.get(`${this.apiUrl}/api/formats/${nombreArchivo}`, {
      responseType: 'blob'
    });
  }
}
