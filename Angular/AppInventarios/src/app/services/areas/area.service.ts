import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environment';
import { Observable } from 'rxjs';

export interface Area {
  id: number;
  name: string;
  description: string;
  status: number;
  id_floor: number;
  floor_name: string;
}

@Injectable({
  providedIn: 'root'
})
export class AreaService {
  private apiUrl = `${environment.apiUrl}/api/areas`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Area[]> {
    return this.http.get<Area[]>(this.apiUrl);
  }

  getById(id: number): Observable<Area> {
    return this.http.get<Area>(`${this.apiUrl}/${id}`);
  }

  create(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  update(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  checkNameExists(name: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check-name/${encodeURIComponent(name)}`);
  }

  reactivar(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/restablecer/${id}`, {});
  }
}
