import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { FormdepartmentComponent } from './formdepartment/formdepartment.component';
import { DepartmentService, Department } from '../../services/departments/department.service';
import { AuthService } from '../../services/auth/auth.service';

type MessageType = 'success' | 'error' | 'warning';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormdepartmentComponent],
  templateUrl: './departments.component.html',
  styleUrls: ['./departments.component.css'],
  providers: [DepartmentService]
})
export class DepartmentsComponent implements OnInit {
  departments: Department[] = [];
  showModal = false;
  departamentoSeleccionado: Department | null = null;
  showDetailModal = false;

  // mensajes
  showMessage = false;
  messageText = '';
  messageType: MessageType = 'success';

  // confirmación
  showConfirmModal = false;
  departamentoAEliminar: Department | null = null;

  // estado carga / edición
  cargaFallida = false;
  private isEditing = false;

  constructor(
    private departmentService: DepartmentService,
    private route: ActivatedRoute,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarDepartamentos();

    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.departmentService.getDepartmentById(+id).subscribe({
          next: (dept: Department) => this.mostrarDetalles(dept),
          error: () => this.mostrarMensaje('No se pudo cargar el departamento', 'error')
        });
      }
    });
  }

  cargarDepartamentos(): void {
    this.cargaFallida = false;
    this.departmentService.getDepartments().subscribe({
      next: data => {
        this.departments = (data ?? []).sort((a, b) =>
          a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
        );
        this.cargaFallida = false;
      },
      error: err => {
        console.error('Error al obtener los departamentos', err);
        this.departments = [];
        this.cargaFallida = true;
        this.mostrarMensaje('Error al obtener los departamentos', 'error');
      }
    });
  }

  abrirEditar(dept: Department): void {
    this.isEditing = true;
    this.departamentoSeleccionado = dept;
    this.showModal = true;
  }

  abrirModal(): void {
    this.isEditing = false;
    this.departamentoSeleccionado = null;
    this.showModal = true;
  }

  cerrarModal(): void {
    this.showModal = false;
    this.departamentoSeleccionado = null;
  }

  // el hijo debe emitir (created)="onCreated()"
  onCreated(): void {
    const wasEditing = this.isEditing;
    this.cerrarModal();
    this.cargarDepartamentos();
    this.mostrarMensaje(
      wasEditing ? 'Departamento actualizado exitosamente' : 'Departamento registrado exitosamente',
      'success'
    );
  }

  seleccionarDepartamento(dept: Department): void {
    this.departamentoSeleccionado = this.departamentoSeleccionado === dept ? null : dept;
  }

  eliminarDepartamento(dept: Department): void {
    if (this.esUsuario()) {
      this.mostrarMensaje('No tienes permisos para eliminar', 'error');
      return;
    }

    // Pre-chequeo (si falla, dejamos que el DELETE valide)
    this.departmentService.hasAssignedEquipment(dept.id!).subscribe({
      next: (has) => {
        if (has) {
          this.mostrarMensaje('No se puede eliminar el departamento porque tiene equipos asignados.', 'warning');
          return;
        }
        this.departamentoAEliminar = dept;
        this.showConfirmModal = true;
      },
      error: (err) => {
        console.warn('Pre-check falló, continúo con confirm:', err);
        this.departamentoAEliminar = dept;
        this.showConfirmModal = true;
      }
    });
  }

  confirmarEliminacion(): void {
    if (this.esUsuario() || !this.departamentoAEliminar) {
      this.mostrarMensaje('No tienes permisos para eliminar', 'error');
      return;
    }

    this.departmentService.deleteDepartment(this.departamentoAEliminar.id!).subscribe({
      next: () => {
        this.cargarDepartamentos();
        this.mostrarMensaje('Departamento eliminado exitosamente', 'success');
      },
      error: (err) => {
        if (err?.status === 409 && err?.error?.code === 'DEPT_HAS_EQUIPMENTS') {
          this.mostrarMensaje(
            err.error?.message || 'No se puede eliminar el departamento porque tiene equipos asignados.',
            'warning'
          );
        } else {
          console.error('Error al eliminar el departamento', err);
          this.mostrarMensaje('Error eliminando el departamento.', 'error');
        }
      }
    });

    this.showConfirmModal = false;
  }

  cancelarEliminacion(): void {
    this.showConfirmModal = false;
    this.departamentoAEliminar = null;
  }

  mostrarMensaje(texto: string, tipo: MessageType): void {
    this.messageText = texto;
    this.messageType = tipo;
    this.showMessage = true;
    setTimeout(() => (this.showMessage = false), tipo === 'success' ? 3000 : 5000);
  }

  mostrarDetalles(dept: Department): void {
    this.departamentoSeleccionado = dept;
    this.showDetailModal = true;
  }

  cerrarDetalle(): void {
    this.showDetailModal = false;
    this.departamentoSeleccionado = null;
  }

  esUsuario(): boolean {
    return this.authService.userRole === 2;
  }
}
