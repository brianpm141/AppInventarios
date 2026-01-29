import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ResponsivaService } from '../../../services/entregas/responsiva.service';
import { UbicacionesService } from '../../../services/ubicaciones/ubicaciones.service';
import { DepartmentService } from '../../../services/departments/department.service';
import { SearchService } from '../../../services/search/search.service';
import { SafeUrlPipe } from '../../../pipes/safe-url.pipe';
import { environment } from '../../../environment';

@Component({
  selector: 'app-entregas',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, SafeUrlPipe],
  templateUrl: './entregas.component.html',
  styleUrl: './entregas.component.css'
})
export class EntregasComponent implements OnInit {

  responsable = '';
  id_piso: number | null = null;
  id_area: number | null = null;
  id_departamento: number | null = null;
  serieBusqueda = '';
  dispositivosEncontrados: any[] = [];
  dispositivosSeleccionados: any[] = [];
  pisos: any[] = [];
  areasFiltradas: any[] = [];
  departamentos: any[] = [];
  mensaje = '';
  showPreview = false;
  previewBlob: Blob | null = null;
  responsivas: any[] = [];
  responsivaSeleccionada: any = null;
  mensajeTipo = '';
  showDeleteConfirm = false;
  responsivaAEliminar: any = null;
  archivoSeleccionado: { [id: number]: File } = {};
  documentosResponsiva: any[] = [];
  documentosPorResponsiva: { [id: number]: any[] } = {};
  backendUrl = environment.apiUrl;
  previewUrl: SafeResourceUrl | null = null;
  showCategoryConfirm = false;
  devicePendienteAgregar: any = null;
  categoriaPendiente: string = '';
  categoryModalClosing = false;
  deleteModalClosing = false;
  filtroResponsivas = '';
  responsivasFiltradas: any[] = []; // Lista filtrada

  constructor(
    private responsivaService: ResponsivaService,
    private ubicacionesService: UbicacionesService,
    private departmentService: DepartmentService,
    private searchService: SearchService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.ubicacionesService.getUbicaciones().subscribe(res => this.pisos = res);
    this.departmentService.getDepartments().subscribe(res => this.departamentos = res);
    this.cargarResponsivas();
  }

  mostrarMensaje(texto: string, tipo: 'success' | 'error') {
    this.mensaje = texto;
    this.mensajeTipo = tipo;
    setTimeout(() => this.mensaje = '', 3000);
  }

cargarResponsivas() {
  this.responsivaService.obtenerResponsivas().subscribe({
    next: async (res) => {
      this.responsivas = await Promise.all(
        res.map(async (resp: any) => {
          const detalle = await this.responsivaService.obtenerDetalleResponsiva(resp.id).toPromise();
          return {
            ...resp,
            dispositivos: detalle?.dispositivos || []
          };
        })
      );
      this.responsivas.sort((a: any, b: any) => b.status - a.status);
      this.responsivasFiltradas = [...this.responsivas];
      
      // Carga los documentos para cada responsiva
      for (const r of this.responsivas) {
        this.responsivaService.obtenerDocumentos(r.id).subscribe({
          next: docs => this.documentosPorResponsiva[r.id] = docs,
          error: () => this.documentosPorResponsiva[r.id] = []
        });
      }
    },
    error: () => this.mensaje = 'Error al cargar las responsivas'
  });
}

  closeDeleteConfirm() {
    this.deleteModalClosing = true;
    setTimeout(() => {
      this.showDeleteConfirm = false;
      this.deleteModalClosing = false;
    }, 220);
  }

  cerrarDetalle() {
    this.responsivaSeleccionada = null;
  }

  cargarAreas() {
    const pisoSeleccionado = this.pisos.find(p => p.id === this.id_piso);
    this.areasFiltradas = pisoSeleccionado?.areas || [];
    this.id_area = null;
  }

  // ============================
  // BÚSQUEDA SOLO RESGUARDO
  // ============================
  buscarEquipo() {
    const query = this.serieBusqueda.trim();
    if (!query) {
      this.dispositivosEncontrados = [];
      return;
    }

    this.searchService.search(query).subscribe({
      next: res => {
        // Solo mostrar equipos en resguardo y que no estén ya seleccionados
        this.dispositivosEncontrados = (res.devices || [])
          .filter(d => d.func === 'resguardo')
          .filter(d => !this.dispositivosSeleccionados.some(sel => sel.id === d.id));
      },
      error: () => this.dispositivosEncontrados = []
    });
  }

  seleccionarDispositivo(dev: any) {
    // Bloquear cualquier equipo que no esté en resguardo
    if (dev.func !== 'resguardo') { // <--- CAMBIO
      this.mostrarMensaje('Solo puedes agregar equipos en resguardo.', 'error');
      return;
    }

    // Verificar si ya hay un equipo de la misma categoría
    const existeMismaCategoria = this.dispositivosSeleccionados
      .some(d => d.category_id === dev.category_id);

    if (existeMismaCategoria) {
      // Guardar datos y mostrar modal personalizado
      this.devicePendienteAgregar = dev;
      this.categoriaPendiente = dev.category;
      this.showCategoryConfirm = true;
      return;
    }

    if (this.dispositivosSeleccionados.some(d => d.id === dev.id)) {
      this.mostrarMensaje('Este dispositivo ya fue añadido.', 'error');
      return;
    }

    this.dispositivosSeleccionados.push(dev);
    this.serieBusqueda = '';
    this.dispositivosEncontrados = [];
  }

  confirmarAgregarMismaCategoria() {
    if (this.devicePendienteAgregar) {
      this.dispositivosSeleccionados.push(this.devicePendienteAgregar);
      this.serieBusqueda = '';
      this.dispositivosEncontrados = [];
    }
    this.cerrarModalCategoria();
  }

  cerrarModalCategoria() {
    this.categoryModalClosing = true;
    setTimeout(() => {
      this.showCategoryConfirm = false;
      this.categoryModalClosing = false;
      this.devicePendienteAgregar = null;
      this.categoriaPendiente = '';
    }, 220);
  }

  agregarPrimerDispositivo() {
    if (this.dispositivosEncontrados.length > 0) {
      this.seleccionarDispositivo(this.dispositivosEncontrados[0]);
    }
  }

  agregarDispositivo() {
    const equipo = this.dispositivosEncontrados.find(d => d.serial_number === this.serieBusqueda);
    if (!equipo) return;

    // Solo permitir agregar si está en resguardo
    if (equipo.func !== 'resguardo') { // <--- CAMBIO
      this.mostrarMensaje('Solo puedes agregar equipos en resguardo.', 'error');
      return;
    }
    if (this.dispositivosSeleccionados.some(d => d.id === equipo.id)) {
      this.mostrarMensaje('Este dispositivo ya fue añadido.', 'error');
      return;
    }
    this.dispositivosSeleccionados.push(equipo);
    this.serieBusqueda = '';
    this.dispositivosEncontrados = [];
  }

  quitarDispositivo(id: number) {
    this.dispositivosSeleccionados = this.dispositivosSeleccionados.filter(dev => dev.id !== id);
  }

  limpiarFormulario() {
    this.responsable = '';
    this.id_piso = null;
    this.id_area = null;
    this.id_departamento = null;
    this.dispositivosSeleccionados = [];
    this.serieBusqueda = '';
    this.dispositivosEncontrados = [];
    this.mensaje = '';
  }

  previsualizar() {
    if (!this.responsable || !this.id_area || !this.id_departamento || this.dispositivosSeleccionados.length === 0) {
      this.mensaje = 'Completa todos los campos y añade al menos un dispositivo.';
      return;
    }

    const data = {
      responsable: this.responsable,
      id_area: this.id_area,
      id_departamento: this.id_departamento,
      dispositivos: this.dispositivosSeleccionados
    };

    this.responsivaService.previsualizarResponsiva(data).subscribe({
      next: blob => {
        this.previewBlob = blob;
        this.showPreview = true;
      },
      error: () => this.mensaje = 'Error al generar la previsualización'
    });
  }

  confirmarResponsiva() {
    if (!this.responsable || !this.id_area || !this.id_departamento || this.dispositivosSeleccionados.length === 0) {
      this.mensaje = 'Completa todos los campos y añade al menos un dispositivo.';
      return;
    }

    const data = {
      responsable: this.responsable,
      id_area: this.id_area,
      id_departamento: this.id_departamento,
      user_id: 1,
      dispositivos: this.dispositivosSeleccionados.map(d => d.id)
    };

    this.responsivaService.crearResponsiva(data).subscribe({
      next: (res: any) => {
        this.downloadPDF(res.id);
        this.limpiarFormulario();
        this.showPreview = false;
        this.cargarResponsivas();
        this.mostrarMensaje('Responsiva registrada correctamente', 'success');
      },
      error: () => this.mostrarMensaje('Error al registrar la responsiva', 'error')
    });
  }

  downloadPDF(id: number) {
    this.responsivaService.descargarPDF(id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    });
  }

  cancelarResponsiva(id: number) {
    if (!confirm('¿Estás seguro de cancelar esta responsiva?')) return;
    this.responsivaService.cancelarResponsiva(id).subscribe({
      next: () => {
        this.cargarResponsivas();
        this.cerrarDetalle();
        this.mostrarMensaje('Responsiva cancelada correctamente', 'success');
      },
      error: () => this.mostrarMensaje('Error al cancelar la responsiva', 'error')
    });
  }

  abrirEliminarModal(resp: any) {
    this.responsivaAEliminar = resp;
    this.showDeleteConfirm = true;
  }

  confirmarEliminacionDefinitiva() {
    this.responsivaService.eliminarResponsiva(this.responsivaAEliminar.id).subscribe({
      next: () => {
        this.cargarResponsivas();
        this.mostrarMensaje('Responsiva eliminada permanentemente', 'success');
        this.showDeleteConfirm = false;
      },
      error: () => this.mostrarMensaje('Error al eliminar la responsiva', 'error')
    });
  }

  eliminarDefinitivo(id: number) {
    if (!confirm('¿Deseas eliminar la responsiva permanentemente? Esta acción no se puede deshacer.')) return;

    this.responsivaService.eliminarResponsiva(id).subscribe({
      next: () => {
        this.cargarResponsivas();
        this.mostrarMensaje('Responsiva eliminada permanentemente', 'success');
      },
      error: () => this.mostrarMensaje('Error al eliminar la responsiva', 'error')
    });
  }

  onArchivoSeleccionado(event: any, responsivaId: number): void {
    const archivo = event.target.files[0];
    if (archivo) {
      this.archivoSeleccionado[responsivaId] = archivo;
    }
  }

  subirDocumento(responsivaId: number): void {
    const archivo = this.archivoSeleccionado[responsivaId];
    if (!archivo) {
      this.mostrarMensaje('Primero debes seleccionar un archivo para subir.', 'error');
      return;
    }

    if (archivo.type !== 'application/pdf') {
      this.mostrarMensaje('Solo se permiten archivos PDF.', 'error');
      return;
    }

    this.responsivaService.subirDocumento(responsivaId, archivo).subscribe({
      next: () => {
        this.mostrarMensaje('Documento subido correctamente', 'success');
        this.obtenerDocumentosResponsiva(responsivaId);
      },
      error: () => {
        this.mostrarMensaje('Error al subir el documento', 'error');
      }
    });
  }

  verDetalleResponsiva(id: number): void {
    this.previewUrl = null;
    this.responsivaSeleccionada = null;
    this.documentosResponsiva = [];

    this.responsivaService.obtenerDetalleResponsiva(id).subscribe({
      next: (data) => {
        this.responsivaSeleccionada = data;

        this.responsivaService.obtenerDocumentos(id).subscribe({
          next: (docs) => {
            this.documentosResponsiva = docs;
            if (docs.length > 0) {
              const path = `${this.backendUrl}/uploads/responsivas/${docs[0].ruta_archivo}`;
              this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(path);
            }
          },
          error: () => {
            this.documentosResponsiva = [];
          }
        });
      },
      error: () => {
        this.mensaje = 'Error al obtener la responsiva';
      }
    });
  }

  descargarDocumento() {
    const doc = this.documentosResponsiva[0];
    const url = `${this.backendUrl}/api/responsivas/descargar/${doc.ruta_archivo}`;

    const link = document.createElement('a');
    link.href = url;
    link.download = doc.nombre_archivo;
    link.click();
  }

  tieneDocumento(responsivaId: number): boolean {
    return (
      this.documentosPorResponsiva &&
      this.documentosPorResponsiva[responsivaId] &&
      this.documentosPorResponsiva[responsivaId].length > 0
    );
  }

  obtenerDocumentosResponsiva(id: number): void {
    this.responsivaService.obtenerDocumentos(id).subscribe({
      next: (docs) => {
        this.documentosResponsiva = docs;
        if (docs.length > 0) {
          const path = `${this.backendUrl}/uploads/responsivas/${docs[0].ruta_archivo}`;
          this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(path);
        } else {
          this.previewUrl = null;
        }
      },
      error: () => {
        this.documentosResponsiva = [];
        this.previewUrl = null;
      }
    });
  }

  eliminarDocumento(docId: number) {
    if (!this.responsivaSeleccionada) return;

    if (confirm('¿Deseas eliminar este documento firmado?')) {
      this.responsivaService
        .eliminarDocumento(this.responsivaSeleccionada.id, docId)
        .subscribe({
          next: () => {
            this.mostrarMensaje('Documento eliminado correctamente', 'success');
            this.obtenerDocumentosResponsiva(this.responsivaSeleccionada.id);
            this.previewUrl = '';
          },
          error: () => {
            this.mostrarMensaje('Error al eliminar documento', 'error');
          }
        });
    }
  }

  descargarSinFirmas(id: number, folio: string) {
    this.responsivaService.descargarPDF(id).subscribe(blob => {
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `RES_${folio}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  filtrarResponsivas() {
    if (!this.filtroResponsivas.trim()) {
      this.responsivasFiltradas = [...this.responsivas];
      return;
    }
    const termino = this.filtroResponsivas.toLowerCase().trim();
    this.responsivasFiltradas = this.responsivas.filter(resp => {
      // Búsqueda por folio
      if (resp.folio?.toLowerCase().includes(termino)) {
        return true;
      }
      // Búsqueda por responsable
      if (resp.responsable?.toLowerCase().includes(termino)) {
        return true;
      }
      // Búsqueda por serial number en dispositivos
      if (resp.dispositivos && resp.dispositivos.length > 0) {
        return resp.dispositivos.some((dispositivo: any) => 
          dispositivo.serial_number?.toLowerCase().includes(termino)
        );
      }
      return false;
    });
  }
}
