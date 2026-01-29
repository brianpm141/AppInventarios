import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AccessoryService } from '../../services/accessories/accessory.service';
import { CategoriesService } from '../../services/categories/categories.service';
import { FormaccessoriesComponent } from './formaccessories/formaccessories.component';

interface Category {
  id: number;
  name: string;
}

export interface Accessory {
  id: number;
  brand: string;
  product_name: string;
  total: number;
  category_id: number;
  category_name?: string;
  details?: string;
  status?: number;
  created_at?: string;
}

@Component({
  selector: 'app-accessories',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, FormaccessoriesComponent],
  templateUrl: './accessories.component.html',
  styleUrls: ['./accessories.component.css']
})
export class AccessoriesComponent implements OnInit, OnDestroy {

  private accesoriosOriginal = signal<Accessory[]>([]);
  accesorios = signal<Accessory[]>([]);
  categorias: Category[] = [];

  categoriaSeleccionada: number | null = null;
  ordenSeleccionado: 'nombreAsc' | 'nombreDesc' | 'recientes' | 'stockAsc' | 'agotadosPrimero' = 'nombreAsc';

  showModal = false;
  showDetailModal = false;
  showConfirmModal = false;

  accesorioSeleccionado: Accessory | null = null;
  accesorioAEliminar: Accessory | null = null;

  showMessage = false;
  messageText = '';
  messageType: 'success' | 'error' = 'success';

  accesorioEnCero: Accessory | null = null;
  mensajeZero = '';
  showZeroMessage = false;
  private zeroTimer?: any;

  hasLoaded = false;

  constructor(
    private accessoriesService: AccessoryService,
    private categoriesService: CategoriesService
  ) {}

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarAccesorios();
  }

  ngOnDestroy(): void {
    if (this.zeroTimer) clearTimeout(this.zeroTimer);
  }

  cargarAccesorios(): void {
    this.hasLoaded = false;
    this.accessoriesService.getAll().subscribe({
      next: (res: Accessory[]) => {
        this.accesoriosOriginal.set(res ?? []);
        this.aplicarFiltros();
        this.hasLoaded = true;
      },
      error: () => {
        this.mostrarMensaje('error', 'Error al cargar accesorios');
        this.hasLoaded = true;
      }
    });
  }

  cargarCategorias(): void {
    this.categoriesService.getAccessoriesCategories().subscribe({
      next: (res: Category[]) => this.categorias = res ?? [],
      error: () => this.mostrarMensaje('error', 'Error al cargar categorías')
    });
  }

  private cmpText(a: string, b: string): number {
    return (a ?? '').localeCompare(b ?? '', undefined, { sensitivity: 'base', numeric: true });
  }

  aplicarFiltros(): void {
    let lista = [...this.accesoriosOriginal()];

    if (this.categoriaSeleccionada) {
      lista = lista.filter(a => a.category_id === this.categoriaSeleccionada);
    }

    switch (this.ordenSeleccionado) {
      case 'nombreAsc':
        lista.sort((a, b) => this.cmpText(a.product_name, b.product_name));
        break;
      case 'nombreDesc':
        lista.sort((a, b) => this.cmpText(b.product_name, a.product_name));
        break;
      case 'recientes': {
        const toTs = (d?: string) => (d ? new Date(d).getTime() : 0);
        const tieneFechas = lista.some(x => !!x.created_at);
        if (tieneFechas) {
          lista.sort((a, b) => toTs(b.created_at) - toTs(a.created_at));
        } else {
          lista.sort((a, b) => b.id - a.id);
        }
        break;
      }
      case 'stockAsc':
        lista.sort((a, b) => a.total - b.total || this.cmpText(a.product_name, b.product_name));
        break;
      case 'agotadosPrimero':
        const rank = (t: number) => (t === 0 ? 0 : t === 1 ? 1 : 2);
        lista.sort((a, b) =>
          rank(a.total) - rank(b.total) ||
          a.total - b.total ||
          this.cmpText(a.product_name, b.product_name)
        );
        break;
    }

    this.accesorios.set(lista);
  }

  filtrarPorCategoria(): void {
    this.aplicarFiltros();
  }

  abrirModal(): void {
    this.accesorioSeleccionado = null;
    this.showModal = true;
  }

  cerrarModal(): void {
    this.showModal = false;
  }

  editar(accesorio: Accessory): void {
    this.accesorioSeleccionado = accesorio;
    this.showModal = true;
  }

  abrirConfirmacion(accesorio: Accessory): void {
    this.accesorioAEliminar = accesorio;
    this.showConfirmModal = true;
  }

  cancelarEliminacion(): void {
    this.accesorioAEliminar = null;
    this.showConfirmModal = false;
  }

  confirmarEliminacion(): void {
    if (!this.accesorioAEliminar) return;

    this.accessoriesService.delete(this.accesorioAEliminar.id).subscribe({
      next: () => {
        this.mostrarMensaje('success', 'Accesorio eliminado');
        this.cargarAccesorios();
        this.cancelarEliminacion();
      },
      error: () => this.mostrarMensaje('error', 'Error al eliminar accesorio')
    });
  }

  mostrarDetalles(accesorio: Accessory): void {
    this.accesorioSeleccionado = accesorio;
    this.showDetailModal = true;
  }

  cerrarDetalle(): void {
    this.accesorioSeleccionado = null;
    this.showDetailModal = false;
  }

  get showDetailBanner(): boolean {
    const acc = this.accesorioSeleccionado;
    return !!acc && acc.total <= 1;
  }

  get detailBannerText(): string {
    const acc = this.accesorioSeleccionado;
    if (!acc) return '';
    return acc.total === 0
      ? `El accesorio "${acc.product_name}" está agotado.`
      : `El accesorio "${acc.product_name}" está por agotarse, solo queda 1.`;
  }

  onCreated(recargado: boolean): void {
    if (recargado) this.cargarAccesorios();
  }

  mostrarMensaje(tipo: 'success' | 'error', texto: string): void {
    this.messageType = tipo;
    this.messageText = texto;
    this.showMessage = true;
    setTimeout(() => this.showMessage = false, 3000);
  }

  actualizarTotal(accesorio: Accessory, cambio: number): void {
    const nuevoTotal = accesorio.total + cambio;
    if (nuevoTotal < 0) return;

    const actualizado: Accessory = { ...accesorio, total: nuevoTotal };

    this.accessoriesService.update(accesorio.id, actualizado).subscribe({
      next: () => {
        const original = [...this.accesoriosOriginal()];
        const idx0 = original.findIndex(a => a.id === accesorio.id);
        if (idx0 > -1) {
          original[idx0] = actualizado;
          this.accesoriosOriginal.set(original);
        }

        this.aplicarFiltros();

        if (this.accesorioSeleccionado?.id === accesorio.id) {
          this.accesorioSeleccionado = { ...actualizado };
        }

        if (nuevoTotal <= 1) {
          this.accesorioEnCero = actualizado;
          this.mensajeZero = nuevoTotal === 0
            ? `El accesorio "${actualizado.product_name}" se ha agotado completamente!.`
            : `El accesorio "${actualizado.product_name}" está por agotarse, solo queda 1!.`;
          this.showZeroMessage = true;

          if (this.zeroTimer) clearTimeout(this.zeroTimer);
          this.zeroTimer = setTimeout(() => { this.showZeroMessage = false; }, 3000);
        } else {
          this.mostrarMensaje('success', `Total actualizado a ${nuevoTotal}`);
        }
      },
      error: () => this.mostrarMensaje('error', 'Error al actualizar total')
    });
  }
}