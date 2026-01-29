import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeviceService } from '../../services/devices/device.service';
import { FormdevicesComponent } from './formdevices/formdevices.component';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [CommonModule, FormsModule, FormdevicesComponent],
  templateUrl: './devices.component.html',
  styleUrls: ['./devices.component.css']
})
export class DevicesComponent implements OnInit {

  equipos: any[] = [];
  equipoSeleccionado: any = null;

  categorias: any[] = [];
  categoriaSeleccionada: number | 'todos' = 'todos';

  funcSeleccionado: string = 'todos';

  showMessage = false;
  messageText = '';
  messageType: 'success' | 'error' = 'success';

  showDetailModal = false;
  showConfirmModal = false;
  equipoAEliminar: any = null;

  showModal = false;

  allEquipos: any[] = [];        // <- fuente original
  serialQuery = '';

  // control "una sola vez" para el intento de editar en baja
  private alertShownThisOpen = false;
  // bandera que usa el HTML del modal de detalle
  showBajaAlertOnce = false;

  constructor(
    private deviceService: DeviceService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.obtenerCategorias();
    this.obtenerEquipos();

    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.mostrarDetalles({ id: Number(id) });
      }
    });
  }

  private mostrarMensaje(texto: string, tipo: 'success' | 'error') {
    this.messageText = texto;
    this.messageType = tipo;
    this.showMessage = true;
    setTimeout(() => {
      this.showMessage = false;
      this.messageText = '';
    }, 3000);
  }

  obtenerCategorias(): void {
    this.deviceService.getCategories().subscribe({
      next: data => {
        this.categorias = [{ id: 'todos', name: 'Todos' }, ...data];
      },
      error: () => this.mostrarMensaje('Error al cargar categorías.', 'error')
    });
  }

  obtenerEquipos(): void {
    this.deviceService.getAll().subscribe({
      next: data => {
        this.allEquipos = data;      // guardamos crudo
        this.applyFilters();          // aplicamos todos los filtros vigentes
      },
      error: () => this.mostrarMensaje('Error al cargar los equipos.', 'error')
    });
  }

  private applyFilters(): void {
    const func = this.funcSeleccionado;
    const cat = this.categoriaSeleccionada;
    const q = (this.serialQuery || '').trim().toLowerCase();

    this.equipos = this.allEquipos
      .filter(e => func === 'todos' ? true : e.func === func)
      .filter(e => cat === 'todos' ? true : e.category_id === cat)
      .filter(e => q === '' ? true : (e.serial_number || '').toLowerCase().includes(q));
  }

  filtrarPorCategoria(): void {
    this.obtenerEquipos();
  }

  filtrarPorFunc(): void {
    this.obtenerEquipos();
  }

  filtrarPorSerie(): void { 
    this.applyFilters(); }

  // Ver detalles "normal" (sin alerta)
  mostrarDetalles(equipo: any) {
    this.deviceService.getById(equipo.id).subscribe({
      next: data => {
        this.equipoSeleccionado = data;
        this.showDetailModal = true;
        // en detalle normal NO mostramos la alerta
        this.showBajaAlertOnce = false;
        this.alertShownThisOpen = false;
      },
      error: () => this.mostrarMensaje('Error al cargar detalles del equipo.', 'error')
    });
  }

  cerrarDetalle() {
    this.showDetailModal = false;
    this.alertShownThisOpen = false;
    this.showBajaAlertOnce = false;
  }

  abrirModal() {
    this.equipoSeleccionado = null;
    this.showDetailModal = false;
    this.alertShownThisOpen = false;
    this.showBajaAlertOnce = false;
    this.showModal = true;
  }

  cerrarModal() {
    this.showModal = false;
    this.alertShownThisOpen = false;
    this.showBajaAlertOnce = false;
    this.obtenerEquipos();
  }

  // Intento de editar: si está en baja -> abrir detalle con alerta interna; si no, abrir form
  abrirEditar(equipo: any) {
    this.deviceService.getById(equipo.id).subscribe({
      next: data => {
        this.equipoSeleccionado = data;

        if (data.func === 'baja') {
          this.showModal = false;
          this.showDetailModal = true;

          if (!this.alertShownThisOpen) {
            // NO usamos mostrarMensaje: la alerta vive dentro del modal de detalles
            this.showBajaAlertOnce = true;
            this.alertShownThisOpen = true;
          }
        } else {
          // edición normal
          this.showDetailModal = false;
          this.showBajaAlertOnce = false;
          this.alertShownThisOpen = false;
          this.showModal = true;
        }
      },
      error: err => {
        console.error('Error al obtener equipo para edición', err);
        this.mostrarMensaje('Error al cargar el equipo para editar.', 'error');
      }
    });
  }

  eliminarEquipo(equipo: any) {
    if (equipo.func !== 'baja') {
      this.mostrarMensaje('Solo se pueden eliminar equipos dados de baja', 'error');
      return;
    }

    this.equipoAEliminar = equipo;
    this.showConfirmModal = true;
  }

  cancelarEliminacion() {
    this.showConfirmModal = false;
    this.equipoAEliminar = null;
  }

  confirmarEliminacion() {
    this.deviceService.delete(this.equipoAEliminar.id).subscribe({
      next: () => {
        this.mostrarMensaje('Equipo eliminado correctamente.', 'success');
        this.obtenerEquipos();
        this.cancelarEliminacion();
      },
      error: () => {
        this.mostrarMensaje('Error al eliminar el equipo.', 'error');
        this.cancelarEliminacion();
      }
    });
  }

  onCreated(success: boolean) {
    this.obtenerEquipos();
    this.showModal = false;
    this.alertShownThisOpen = false;
    this.showBajaAlertOnce = false;
  }
}
