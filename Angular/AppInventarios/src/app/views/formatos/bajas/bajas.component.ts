import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { DeviceService } from '../../../services/devices/device.service';
import { BajaService } from '../../../services/baja/baja.service';
import { DepartmentService, Department } from '../../../services/departments/department.service';

import { EMPTY } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-bajas',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './bajas.component.html',
  styleUrls: ['./bajas.component.css']
})
export class BajasComponent implements OnInit {

  dispositivos: any[] = [];
  dispositivosFiltrados: any[] = [];

  equipoSeleccionado: any = null;
  equipoAEliminar: any = null;

  categorias: any[] = [];
  categoriaSeleccionada: number | 'todos' = 'todos';
  estadoSeleccionado: 'todos' | 'resguardo' | 'baja' = 'todos';

  departamentos: Department[] = []; // ⬅️ NUEVO

  showDetailModal = false;
  showConfirmModal = false;
  showModal = false;

  showMessage = false;
  messageText = '';
  messageType: 'success' | 'error' = 'success';

  formBaja = {
    motivo: '',
    detectado_por: '',
    observaciones: '',
    id_departamento: null as number | null // ⬅️ NUEVO
  };

  bajas: any[] = [];
  bajaSeleccionada: any = null;
  documentosBaja: any[] = [];
  archivoSeleccionado: { [id: number]: File } = {};
  previewUrl: SafeResourceUrl | null = null;

  textoBusqueda: string = '';
  modalVisible = false;

  confirmRestoreVisible = false;
  bajaAReestablecer: any = null;

  // confirmación para eliminar baja
  mostrarConfirmacionEliminar = false;
  equipoAEliminarBaja: any = null;

  constructor(
    private deviceService: DeviceService,
    private bajaService: BajaService,
    private departmentsService: DepartmentService, // ⬅️ NUEVO
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.obtenerCategorias();
    this.obtenerDispositivos();
    this.cargarBajas();
    this.cargarDepartamentos(); // ⬅️ NUEVO
  }

  // ---------- CARGA DE DATOS ----------
  obtenerCategorias(): void {
    this.deviceService.getCategories().subscribe({
      next: data => {
        this.categorias = [{ id: 'todos', name: 'Todos' }, ...data];
      },
      error: () => this.mostrarMensaje('Error al cargar categorías', 'error')
    });
  }

  obtenerDispositivos(): void {
    this.deviceService.getAll().subscribe({
      next: data => {
        // Solo resguardo y baja en la vista
        this.dispositivos = data.filter((d: any) => d.func === 'resguardo' || d.func === 'baja');
        this.aplicarFiltros();
      },
      error: () => this.mostrarMensaje('Error al cargar dispositivos', 'error')
    });
  }

  cargarBajas(): void {
    this.bajaService.obtenerBajas().subscribe({
      next: (data) => (this.bajas = data),
      error: () => this.mostrarMensaje('Error al cargar bajas', 'error'),
    });
  }

  // ⬇️ NUEVO: cargar departamentos activos
  cargarDepartamentos(): void {
    this.departmentsService.getDepartments().subscribe({
      next: (data) => {
        // Si el endpoint ya filtra por status=1, esto es redundante pero seguro
        this.departamentos = (data || []).filter((d: any) => d.status === 1 || d.status === undefined);
      },
      error: () => this.mostrarMensaje('Error al cargar departamentos', 'error')
    });
  }

  // ---------- FILTROS ----------
  aplicarFiltros(): void {
    let filtrados = [...this.dispositivos];

    if (this.estadoSeleccionado !== 'todos') {
      filtrados = filtrados.filter(d => d.func === this.estadoSeleccionado);
    }

    if (this.categoriaSeleccionada !== 'todos') {
      filtrados = filtrados.filter(d => d.category_id === this.categoriaSeleccionada);
    }

    if (this.textoBusqueda.trim() !== '') {
      const busqueda = this.textoBusqueda.toLowerCase();
      filtrados = filtrados.filter(d =>
        (d.brand || '').toLowerCase().includes(busqueda) ||
        (d.model || '').toLowerCase().includes(busqueda) ||
        (d.serial_number || '').toLowerCase().includes(busqueda) ||
        (d.category_name || '').toLowerCase().includes(busqueda)
      );
    }

    this.dispositivosFiltrados = filtrados;
  }

  filtrarPorCategoria(): void { this.aplicarFiltros(); }
  filtrarPorEstado(): void { this.aplicarFiltros(); }
  buscarDispositivo(): void { this.aplicarFiltros(); }

  // ---------- MENSAJES ----------
  mostrarMensaje(texto: string, tipo: 'success' | 'error') {
    this.messageText = texto;
    this.messageType = tipo;
    this.showMessage = true;
    setTimeout(() => {
      this.showMessage = false;
      this.messageText = '';
    }, 3000);
  }

  // ---------- DETALLE DISPOSITIVO ----------
  mostrarDetalles(equipo: any) {
    this.deviceService.getById(equipo.id).subscribe({
      next: data => {
        this.equipoSeleccionado = data;
        this.showDetailModal = true;
      },
      error: () => this.mostrarMensaje('Error al cargar detalles del equipo.', 'error')
    });
  }

  cerrarDetalleDispositivo(): void {
    this.showDetailModal = false;
  }

  // ---------- BAJA: ABRIR / CERRAR MODAL ----------
  abrirModalBaja(equipo: any): void {
    // 🔒 Candado #1: Solo permitir si está en RESGUARDO
    if (!equipo || equipo.func !== 'resguardo') {
      this.mostrarMensaje('Solo puedes dar de baja equipos en RESGUARDO.', 'error');
      return;
    }

    this.equipoSeleccionado = equipo;

    // Resetea form e id_departamento para forzar selección del usuario
    this.formBaja = { motivo: '', detectado_por: '', observaciones: '', id_departamento: null };

    // (Opcional) Si conoces un depto por defecto del equipo, podrías precargarlo:
    // this.formBaja.id_departamento = equipo.department_id || null;

    this.modalVisible = true;
  }

  cerrarModal(): void {
    this.modalVisible = false;
    this.equipoSeleccionado = null;
  }

  // ---------- BAJA: CONFIRMAR ----------
  confirmarBaja(): void {
    if (!this.equipoSeleccionado) return;

    // Validación de formulario (incluye departamento requerido)
    if (
      !this.formBaja.motivo.trim() ||
      !this.formBaja.detectado_por.trim() ||
      !this.formBaja.observaciones.trim() ||
      !this.formBaja.id_departamento
    ) {
      this.mostrarMensaje('Completa todos los campos y selecciona un departamento.', 'error');
      return;
    }

    // 🔒 Candado #2: Revalidar estado actual en backend (evita condiciones de carrera)
    this.deviceService.getById(this.equipoSeleccionado.id).pipe(
      switchMap((devActual: any) => {
        if (!devActual || devActual.func !== 'resguardo') {
          this.mostrarMensaje('El equipo ya no está en RESGUARDO. No se puede dar de baja.', 'error');
          return EMPTY; // corta el flujo
        }

        const bajaPayload = {
          fecha: new Date().toISOString().split('T')[0],
          motivo: this.formBaja.motivo,
          detectado_por: this.formBaja.detectado_por,
          observaciones: this.formBaja.observaciones,
          id_device: this.equipoSeleccionado.id,
          id_departamento: this.formBaja.id_departamento // ⬅️ NUEVO
        };

        return this.bajaService.registrarBaja(bajaPayload);
      })
    ).subscribe({
      next: (pdfBlob: Blob) => {
        const blob = new Blob([pdfBlob], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `baja_${this.equipoSeleccionado.serial_number}.pdf`;
        document.body.appendChild(link);
        setTimeout(() => {
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 0);

        this.cerrarModal();
        this.obtenerDispositivos();
        this.mostrarMensaje('Baja registrada y PDF descargado.', 'success');
      },
      error: (err) => {
        console.error('Error al registrar baja', err);
        this.mostrarMensaje('Error al registrar la baja.', 'error');
      }
    });
  }

  // ---------- ELIMINAR REGISTRO DE BAJA ----------
  confirmarEliminarBaja(equipo: any): void {
    this.equipoAEliminarBaja = equipo;
    this.mostrarConfirmacionEliminar = true;
  }

  cancelarEliminacionBaja(): void {
    this.equipoAEliminarBaja = null;
    this.mostrarConfirmacionEliminar = false;
  }

  eliminarBajaConfirmada(): void {
    const id = this.equipoAEliminarBaja?.id;
    if (!id) return;

    this.bajaService.eliminarBajaPorDeviceId(id).subscribe({
      next: () => {
        this.obtenerDispositivos();
        this.mostrarMensaje('Baja eliminada correctamente.', 'success');
        this.cancelarEliminacionBaja();
      },
      error: () => {
        this.mostrarMensaje('Error al eliminar la baja.', 'error');
        this.cancelarEliminacionBaja();
      }
    });
  }

  // ---------- DETALLE DE BAJA ----------
  verDetallePorDevice(deviceId: number): void {
    const baja = this.bajas.find(b => b.id_device === deviceId);
    if (baja) { this.verDetalleBaja(baja.id); return; }
    // fallback si aún no se han cargado
    this.cargarBajas();
    setTimeout(() => {
      const bx = this.bajas.find(b => b.id_device === deviceId);
      if (bx) this.verDetalleBaja(bx.id);
    }, 300);
  }

  verDetalleBaja(id: number): void {
    this.previewUrl = null;
    this.bajaSeleccionada = null;
    this.documentosBaja = [];

    this.bajaService.obtenerDetalle(id).subscribe({
      next: (data) => {
        this.bajaSeleccionada = data;
        this.cargarDocumentos(id);
      },
      error: () => this.mostrarMensaje('Error al obtener la baja', 'error'),
    });
  }

  private cargarDocumentos(id: number): void {
    this.bajaService.obtenerDocumentos(id).subscribe({
      next: (docs) => {
        this.documentosBaja = docs;
        if (docs.length > 0) {
          const url = this.bajaService.descargarDocumento(docs[0].ruta_archivo);
          this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        } else {
          this.previewUrl = null;
        }
      },
      error: () => { this.documentosBaja = []; this.previewUrl = null; },
    });
  }

  onArchivoSeleccionado(e: Event, bajaId: number): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.archivoSeleccionado[bajaId] = file;
  }

  subirDocumento(bajaId: number): void {
    const file = this.archivoSeleccionado[bajaId];
    if (!file) return this.mostrarMensaje('Selecciona un archivo PDF.', 'error');

    this.bajaService.subirDocumento(bajaId, file).subscribe({
      next: () => { this.mostrarMensaje('Documento subido.', 'success'); this.cargarDocumentos(bajaId); },
      error: () => this.mostrarMensaje('Error al subir documento.', 'error'),
    });
  }

  eliminarDocumento(bajaId: number, docId: number): void {
    this.bajaService.eliminarDocumento(bajaId, docId).subscribe({
      next: () => { this.mostrarMensaje('Documento eliminado.', 'success'); this.cargarDocumentos(bajaId); },
      error: () => this.mostrarMensaje('Error al eliminar documento.', 'error'),
    });
  }

  descargarPDF(id: number): void {
    this.bajaService.descargarPDF(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `baja_${id}.pdf`; a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.mostrarMensaje('Error al descargar PDF.', 'error'),
    });
  }

  cerrarDetalle(): void {
    this.bajaSeleccionada = null;
    this.previewUrl = null;
  }

  // ---------- RESTAURAR (CANCELAR BAJA) ----------
  cancelarBaja(baja: any): void {
    if (!baja?.id_device) return;

    const confirmacion = confirm(
      `⚠️ Estás a punto de restablecer el equipo "${baja.brand} ${baja.model}" (Serie: ${baja.serial_number}) a RESGUARDO.\n\n¿Confirmas que deseas continuar?`
    );
    if (!confirmacion) return;

    this.bajaService.eliminarBajaPorDeviceId(baja.id_device).subscribe({
      next: () => {
        this.cargarBajas();
        this.obtenerDispositivos();
        this.cerrarDetalle();
        this.mostrarMensaje('Baja cancelada. El equipo volvió a resguardo.', 'success');
      },
      error: () => {
        this.mostrarMensaje('Error al cancelar la baja.', 'error');
      }
    });
  }

  abrirConfirmRestaurar(baja: any) {
    this.bajaAReestablecer = baja;
    this.confirmRestoreVisible = true;
  }

  cancelarConfirmRestaurar() {
    this.confirmRestoreVisible = false;
    this.bajaAReestablecer = null;
  }

  confirmarRestaurar() {
    const devId = this.bajaAReestablecer?.id_device;
    if (!devId) { this.mostrarMensaje('No se encontró el dispositivo de la baja.', 'error'); return; }

    this.bajaService.eliminarBajaPorDeviceId(devId).subscribe({
      next: () => {
        this.cargarBajas();
        this.obtenerDispositivos();
        this.cerrarDetalle();
        this.cancelarConfirmRestaurar();
        this.mostrarMensaje('Baja cancelada. El equipo volvió a resguardo.', 'success');
      },
      error: () => this.mostrarMensaje('Error al cancelar la baja.', 'error')
    });
  }
}
