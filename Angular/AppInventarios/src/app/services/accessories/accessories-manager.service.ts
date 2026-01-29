import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environment';

@Injectable({
  providedIn: 'root'
})
export class AccessoriesManagerService {
  private apiUrl = `${environment.apiUrl}/api/accessories`;

  constructor(private http: HttpClient) {}

  // Obtener todos los accesorios activos
  getAll() {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Obtener accesorio por ID
  getById(id: number) {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Crear un nuevo accesorio
  create(data: any) {
    return this.http.post(this.apiUrl, data);
  }

  // Actualizar accesorio
  update(id: number, data: any) {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  // Eliminar accesorio (lógica: status = 0)
  delete(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
