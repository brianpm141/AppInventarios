import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AreaService, Area } from '../../services/areas/area.service';
import { FormAreaComponent } from './form/formarea.component';
import { FormFloorComponent } from './form/formfloor.component';
import { FloorService } from '../../services/floors/floor.service';

interface Floor {
  id: number;
  name: string;
  description?: string;
  status?: number;
}

@Component({
  selector: 'app-floors-areas',
  standalone: true,
  imports: [CommonModule, FormAreaComponent, FormFloorComponent],
  templateUrl: './floors-areas.component.html',
  styleUrls: ['./floors-areas.component.css']
})
export class FloorsAreasComponent implements OnInit {
  // Datos
  areas: Area[] = [];
  pisos: Floor[] = [];

  // Selecciones
  areaSeleccionada: Area | null = null;
  areaAEliminar: Area | null = null;
  pisoSeleccionado: Floor | null = null;
  pisoAEliminar: Floor | null = null;

  // UI state
  pisoExpandidoId: number | null = null;

  showModal = false;
  showFloorModal = false;
  showConfirmModal = false;
  showDetailModal = false;
  showDetailPisoModal = false;

  showMessage = false;
  messageType: 'success' | 'error' = 'success';
  messageText = '';

  showAreaDeleteError = false;
  showFloorDeleteError = false;

  // Restauración área eliminada
  showRestoreModal = false;
  areaReactivarId: number | null = null;
  areaReactivarNombre = '';

  // Restauración piso eliminado
  showRestoreFloorModal = false;
  pisoReactivarId: number | null = null;
  pisoReactivarNombre = '';

  // Búsqueda
  searchQuery = '';
  matchedFloorIds = new Set<number>();

  // Comparador alfabético robusto (español, acentos, ñ y números)
  private collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
  private norm(s: string | null | undefined) { return (s ?? '').trim(); }

  constructor(
    private areaService: AreaService,
    private floorService: FloorService
  ) {}

  ngOnInit(): void {
    this.obtenerAreas();
    this.obtenerPisos();
  }

  // --- Carga de datos ---
  obtenerAreas(): void {
    this.areaService.getAll().subscribe({
      next: (data) => {
        this.areas = (data ?? []).sort((a, b) =>
          this.collator.compare(this.norm(a.name), this.norm(b.name))
        );
        // Recalcular matches si hay query activa
        if (this.searchQuery) this.onSearch(this.searchQuery);
      },
      error: () => this.mostrarMensaje('error', 'Error al obtener las áreas')
    });
  }

  obtenerPisos(): void {
    this.floorService.getAll().subscribe({
      next: (data) => {
        this.pisos = (data ?? []).sort((a, b) =>
          this.collator.compare(this.norm(a?.name), this.norm(b?.name))
        );
      },
      error: () => this.mostrarMensaje('error', 'Error al obtener los pisos')
    });
  }

  // --- Filtro + agrupación ---
  getAreasPorPiso(pisoId: number): Area[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.areas
      .filter(a =>
        a.id_floor === pisoId &&
        (!q || (a?.name ?? '').toLowerCase().includes(q))
      )
      .sort((a, b) => this.collator.compare(this.norm(a.name), this.norm(b.name)));
  }

  // Resalta el piso que contiene el área seleccionada cuando NO está expandido
  hasSelectedAreaOnFloor(pisoId: number): boolean {
    const sel = this.areaSeleccionada;
    return !!sel && sel.id_floor === pisoId;
  }

  // --- Búsqueda ---
  onSearch(value: string): void {
    this.searchQuery = (value || '').trim().toLowerCase();

    if (!this.searchQuery) {
      this.matchedFloorIds.clear();
      return; // conserva el estado de expansión actual
    }

    const matches = this.areas.filter(a =>
      (a?.name ?? '').toLowerCase().includes(this.searchQuery)
    );

    this.matchedFloorIds = new Set(matches.map(a => a.id_floor));

    // Auto-expandir el primer piso con coincidencia
    const firstMatchFloorId = Array.from(this.matchedFloorIds)[0];
    if (firstMatchFloorId !== undefined) {
      this.pisoExpandidoId = firstMatchFloorId;
    }
  }

  // --- Detalles ---
  mostrarDetalles(area: Area): void {
    this.areaSeleccionada = area;
    this.showDetailModal = true;
  }

  mostrarDetallesPiso(piso: Floor): void {
    this.pisoSeleccionado = piso;
    this.showDetailPisoModal = true;
  }

  cerrarDetalle(): void {
    this.areaSeleccionada = null;
    this.showDetailModal = false;
  }

  cerrarDetallePiso(): void {
    this.pisoSeleccionado = null;
    this.showDetailPisoModal = false;
  }

  // --- ABM Área/Piso ---
  abrirModal(): void {
    this.areaSeleccionada = null;
    this.showModal = true;
  }

  cerrarModal(): void {
    this.showModal = false;
  }

  abrirEditarPiso(piso: Floor): void {
    this.pisoSeleccionado = piso;
    this.showFloorModal = true;
  }

  abrirEditar(area: Area): void {
    this.areaSeleccionada = area;
    this.showModal = true;
  }

  eliminarArea(area: Area): void {
    this.areaAEliminar = area;
    this.pisoAEliminar = null;
    this.showConfirmModal = true;
  }

  eliminarPiso(piso: Floor): void {
    this.pisoAEliminar = piso;
    this.areaAEliminar = null;
    this.showConfirmModal = true;
  }

  cancelarEliminacion(): void {
    this.areaAEliminar = null;
    this.pisoAEliminar = null;
    this.showConfirmModal = false;
  }

  confirmarEliminacion(): void {
    if (this.areaAEliminar) {
      this.areaService.delete(this.areaAEliminar.id).subscribe({
        next: () => {
          this.mostrarMensaje('success', 'Área eliminada correctamente');
          this.obtenerAreas();
          this.showConfirmModal = false;
          this.showAreaDeleteError = false;
          this.areaAEliminar = null;
        },
        error: (err) => {
          if (err.status === 409) {
            this.showConfirmModal = false;
            this.showAreaDeleteError = true;
            setTimeout(() => this.showAreaDeleteError = false, 5000);
          } else {
            this.mostrarMensaje('error', 'Error al eliminar el área');
            this.showConfirmModal = false;
          }
        }
      });
    } else if (this.pisoAEliminar) {
      this.floorService.delete(this.pisoAEliminar.id).subscribe({
        next: () => {
          this.mostrarMensaje('success', 'Piso eliminado correctamente');
          this.obtenerPisos();
          this.showConfirmModal = false;
          this.pisoAEliminar = null;
        },
        error: (err) => {
          if (err.status === 409) {
            this.showConfirmModal = false;
            this.showFloorDeleteError = true;
            setTimeout(() => this.showFloorDeleteError = false, 5000);
          } else {
            this.mostrarMensaje('error', 'Error al eliminar el piso');
            this.showConfirmModal = false;
          }
        }
      });
    }
  }

  onCreated(): void {
    this.obtenerAreas();
    this.cerrarModal();
    this.mostrarMensaje('success', 'Área registrada/actualizada correctamente');

    // Si se creó/actualizó un área seleccionada, auto-expandir su piso
    if (this.areaSeleccionada?.id_floor) {
      this.pisoExpandidoId = this.areaSeleccionada.id_floor;
    }
  }

  onCreatedFloor(): void {
    this.obtenerPisos();
    this.showFloorModal = false;
    this.mostrarMensaje('success', 'Piso registrado correctamente');

    // Mantener abierto el piso recién editado/creado (si hay seleccionado)
    if (this.pisoSeleccionado?.id) {
      this.pisoExpandidoId = this.pisoSeleccionado.id;
    }
  }

  toggleExpandirPiso(pisoId: number): void {
    this.pisoExpandidoId = this.pisoExpandidoId === pisoId ? null : pisoId;
  }

  mostrarMensaje(tipo: 'success' | 'error', texto: string): void {
    this.messageType = tipo;
    this.messageText = texto;
    this.showMessage = true;
    setTimeout(() => this.showMessage = false, 5000);
  }

  // --- Restauración área ---
  onRestoreArea(event: { id: number; name: string }): void {
    this.areaReactivarId = event.id;
    this.areaReactivarNombre = event.name;
    this.showRestoreModal = true;
  }

  restablecerArea(): void {
    if (!this.areaReactivarId) return;
    this.areaService.reactivar(this.areaReactivarId).subscribe({
      next: () => {
        this.mostrarMensaje('success', `Área "${this.areaReactivarNombre}" restablecida correctamente`);
        this.obtenerAreas();
        this.showRestoreModal = false;
        // Abrir el piso que contiene el área restablecida
        const restored = this.areas.find(a => a.id === this.areaReactivarId);
        if (restored?.id_floor) this.pisoExpandidoId = restored.id_floor;
        this.areaReactivarId = null;
      },
      error: () => this.mostrarMensaje('error', 'Error al restablecer el área')
    });
  }

  // --- Restauración piso ---
  onRestoreFloor(event: { id: number; name: string }): void {
    this.pisoReactivarId = event.id;
    this.pisoReactivarNombre = event.name;
    this.showRestoreFloorModal = true;
  }

  restablecerPiso(): void {
    if (!this.pisoReactivarId) return;
    this.floorService.restore(this.pisoReactivarId).subscribe({
      next: () => {
        this.mostrarMensaje('success', `Piso "${this.pisoReactivarNombre}" restablecido correctamente`);
        this.obtenerPisos();
        this.showRestoreFloorModal = false;
        // Auto-expandir el piso restablecido
        this.pisoExpandidoId = this.pisoReactivarId!;
        this.pisoReactivarId = null;
      },
      error: () => this.mostrarMensaje('error', 'Error al restablecer el piso')
    });
  }
}
