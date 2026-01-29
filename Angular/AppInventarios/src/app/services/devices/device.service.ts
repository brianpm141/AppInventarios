import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private baseUrl = `${environment.apiUrl}/api/devices`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  create(data: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, data);
  }

  update(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }

  getCustomFieldsByCategory(categoryId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/custom-fields/${categoryId}`);
  }

  getCategories(): Observable<any[]> {
  return this.http.get<any[]>(`${environment.apiUrl}/api/categories?type=0`); // Asegúrate que tu backend filtre por tipo
}

getByCategory(categoryId: number): Observable<any[]> {
  return this.http.get<any[]>(`${this.baseUrl}/category/${categoryId}`);
}

obtenerPorDepartamento(idDepartamento: number): Observable<any[]> {
  return this.http.get<any[]>(`${this.baseUrl}/por-departamento/${idDepartamento}`);
}

}
