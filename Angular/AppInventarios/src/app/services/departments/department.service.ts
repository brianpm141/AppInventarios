import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'src/app/environment';

// Modelo del departamento
export interface Department {
  id?: number;
  name: string;
  abbreviation: string;
  description?: string;
  department_head: string;
  status?: number;
}

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private apiUrl = `${environment.apiUrl}/api/departments`;

  constructor(private http: HttpClient) {}

  // ===== CRUD =====

  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(this.apiUrl);
  }

  getDepartment(id: number): Observable<Department> {
    return this.http.get<Department>(`${this.apiUrl}/${id}`);
  }

  getDepartmentById(id: number): Observable<Department> {
    return this.getDepartment(id);
  }

  createDepartment(data: Department): Observable<Department> {
    return this.http.post<Department>(this.apiUrl, data);
  }

  updateDepartment(id: number, data: Partial<Department>): Observable<Department> {
    return this.http.put<Department>(`${this.apiUrl}/${id}`, data);
  }

  deleteDepartment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  hasAssignedEquipment(departmentId: number): Observable<boolean> {
    return this.http
      .get<{ count: number }>(`${this.apiUrl}/${departmentId}/equipments/count`)
      .pipe(map(r => (r?.count ?? 0) > 0));
  }
}
