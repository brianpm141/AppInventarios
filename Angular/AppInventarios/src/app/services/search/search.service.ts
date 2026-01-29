// src/app/services/search/search.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment';


export interface SearchResults {
  devices?: {
    id: number;
    brand: string;
    model: string;
    serial_number: string;
    category: string;
    func?: string;
    custom_fields?: Array<{ name: string; value: string }>;
  }[];
  categories?: {
    id: number;
    name: string;
    description: string;
  }[];
  departments?: {
    id: number;
    name: string;
    abbreviation: string;
  }[];
  floors?: {
    id: number;
    name: string;
    description: string;
  }[];
  areas?: {
    id: number;
    name: string;
    description: string;
  }[];
  accessories?: {
    id: number;
    product_name: string;
    brand: string;
    category: string;
    total: number;
    custom_fields?: { name: string; value: string }[]; // opcional si los usarás
  }[];
}


@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private baseUrl = `${environment.apiUrl}/api/search`;

  constructor(private http: HttpClient) {}

  search(query: string): Observable<SearchResults> {
    return this.http.get<SearchResults>(`${this.baseUrl}?q=${encodeURIComponent(query)}`);
  }
}
