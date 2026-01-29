import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment';

@Injectable({ providedIn: 'root' })
export class AccessoryService {
    private apiUrl = `${environment.apiUrl}/api/accessories`;

    constructor(private http: HttpClient) {}

    // Obtener todos los accesorios
    getAll(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl);
    }

    // Crear un nuevo accesorio
    create(data: any): Observable<{ message: string; id: number }> {
        return this.http.post<{ message: string; id: number }>(this.apiUrl, data);
    }

    // Actualizar un accesorio
    update(id: number, data: any): Observable<{ message: string }> {
        return this.http.put<{ message: string }>(`${this.apiUrl}/${id}`, data);
    }

    // Eliminar un accesorio
    delete(id: number): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
    }

    // Verificar si ya existe un accesorio con el mismo nombre
    checkNameExists(name: string): Observable<boolean> {
        return this.http.get<boolean>(`${this.apiUrl}/check-name/${encodeURIComponent(name)}`);
    }

    // Obtener las categorías disponibles
    getCategories(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/categories`);
    }
}
