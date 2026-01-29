import { Component, inject } from '@angular/core';
import { Router,  RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Subject, debounceTime } from 'rxjs';
import { SearchService, SearchResults } from '../../services/search/search.service';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  currentTitle: string = '';
  searchResults: SearchResults = {};
  private searchTerm$ = new Subject<string>();

  dropdownVisible = false;
  private router = inject(Router);
  private searchService = inject(SearchService);

  constructor() {

    this.searchTerm$.pipe(debounceTime(300)).subscribe(query => {
  const trimmed = query.trim();
  if (trimmed) {
    this.searchService.search(trimmed).subscribe((results: SearchResults) => {
      this.searchResults = results;
      this.dropdownVisible = true;
    });
  } else {
    this.searchResults = {};
    this.dropdownVisible = false;
  }
});
  }

dropdownElement: HTMLElement | null = null;

ngAfterViewInit(): void {
  this.dropdownElement = document.querySelector('.search-dropdown');
}

handleClickOutside(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  const clickedInside = this.dropdownElement?.contains(target) || target.closest('.search-section');
  if (!clickedInside) {
    this.dropdownVisible = false;
  }
}


  isDeviceWithCustomFields(item: any): boolean {
  return Array.isArray(item?.custom_fields) && item.custom_fields.length > 0;
}

isAccessoryWithCustomFields(item: any): boolean {
  return Array.isArray(item?.custom_fields) && item.custom_fields.length > 0;
}


  // Captura segura del input desde el HTML
  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.onSearchChange(input.value);
  }

  // Enviar término al observable
  onSearchChange(value: string): void {
    this.searchTerm$.next(value);
  }

  // Navegar al detalle y limpiar resultados
  goToDetails(type: string, id: number): void {
  this.searchResults = {};
  if (type === 'categories') {
    this.router.navigate([`/settings/view`, id]);
  } else {
    this.router.navigate([`/${type}/view`, id]);
  }
}
}
