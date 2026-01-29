import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environment';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private apiUrl = `${environment.apiUrl}/api/categories`;

  constructor(private http: HttpClient) {}

  // Obtener todas las categorías
  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Obtener solo categorías tipo accesorio (type = 1)
  getAccessoriesCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}?type=1`);
  }

  // Crear una nueva categoría
  create(data: any) {
    return this.http.post(this.apiUrl, data);
  }

  getById(id: number) {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  // Actualizar una categoría
  update(id: number, data: any) {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  // Eliminar una categoría
  delete(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Obtener los campos personalizados de una categoría
  getCustomFields(categoryId: number) {
    return this.http.get(`${this.apiUrl}/fields/${categoryId}`);
  }

  // Crear un campo personalizado para una categoría
  createCustomField(data: any) {
    return this.http.post(`${this.apiUrl}/addField`, data);
  }

  // Eliminar un campo personalizado
  deleteCustomField(fieldId: number) {
    return this.http.delete(`${this.apiUrl}/fields/${fieldId}`);
  }

  restoreCategory(id: number) {
    return this.http.patch(`${this.apiUrl}/restore/${id}`, {});
  }
}
