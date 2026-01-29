import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment';

@Injectable({
  providedIn: 'root'
})
export class UbicacionesService {
  private apiUrl = `${environment.apiUrl}/api/locations`;

  constructor(private http: HttpClient) {}

  getUbicaciones(departmentId?: number): Observable<any[]> {
  const params = departmentId ? { params: { department_id: departmentId.toString() } } : {};
  return this.http.get<any[]>(this.apiUrl, params);
}
}