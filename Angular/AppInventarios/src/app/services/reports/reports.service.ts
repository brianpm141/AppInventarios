import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environment';
import { Observable } from 'rxjs';

/* ====== Tipos ====== */
export interface Device {
  brand: string;
  model: string;
  serial_number: string;
  category: string;
  func: 'asignado' | 'resguardo' | 'baja' | '' | null;
  is_new: 0 | 1 | boolean;
}

export interface DevicesListResponse {
  devices: Device[];
}

export interface DevicesSummaryResponse {
  totalDevices: number;
  asignado: number;
  resguardo: number;
  baja: number;
  nuevos: number;
  usados: number;
  categories: Array<{ id: number; name: string; total: number }>;
}

export interface AccessoriesSummaryResponse {
  total: number;
  categorias: Array<{ id: number; name: string; total: number }>;
  categoria_mayor: string;
  categoria_menor: string;
}

export interface Accessory {
  brand: string;
  product_name: string;
  category: string;
  total: number;
}

export interface AccessoriesListResponse {
  accessories: Accessory[];
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private apiUrl = `${environment.apiUrl}/api/reports`;

  constructor(private http: HttpClient) {}

  /* ================= DEVICES ================= */

  getSummary(): Observable<DevicesSummaryResponse> {
    return this.http.get<DevicesSummaryResponse>(`${this.apiUrl}/devices-summary`);
  }

  getDevicesList(filters: any): Observable<DevicesListResponse> {
    return this.http.post<DevicesListResponse>(`${this.apiUrl}/devices-list`, filters);
  }

  exportCsv(filters: any): Observable<Blob> {
    // NO genérico <Blob>; Angular infiere Blob por responseType: 'blob'
    return this.http.post(`${this.apiUrl}/devices-export/csv`, filters, {
      responseType: 'blob'
    });
  }

  exportExcel(filters: any): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/devices-export/excel`, filters, {
      responseType: 'blob'
    });
  }

  /* ================= ACCESSORIES ================= */

  getAccessoriesSummary(): Observable<AccessoriesSummaryResponse> {
    return this.http.get<AccessoriesSummaryResponse>(`${this.apiUrl}/accessories-summary`);
  }

  getAccessoriesByCategories(categoryIds: number[]): Observable<AccessoriesListResponse> {
    return this.http.post<AccessoriesListResponse>(`${this.apiUrl}/accessories-list`, {
      categories: categoryIds
    });
  }

  exportAccessoriesCsv(categoryIds: number[]): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/accessories-export/csv`, { categories: categoryIds }, {
      responseType: 'blob'
    });
  }

  exportAccessoriesExcel(categoryIds: number[]): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/accessories-export/excel`, { categories: categoryIds }, {
      responseType: 'blob'
    });
  }

  getAllAccessories(): Observable<Accessory[]> {
    return this.http.get<Accessory[]>(`${this.apiUrl}/all-accessories`);
  }
}
