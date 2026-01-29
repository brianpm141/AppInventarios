import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ElementRef,
  QueryList,
  ViewChild,
  ViewChildren,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { RegistroComponent } from './registro/registro.component';
import { UsuarioService } from '../../services/usuarios/usuario.service';
import { AuthService } from '../../services/auth/auth.service';

interface Usuario {
  id: number;
  nombre: string;
  apellidos: string;
  usuario: string;
  role: number;      
  status?: number;
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RegistroComponent],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  // Datos
  usuarios: Usuario[] = [];
  filteredUsuarios: Usuario[] = [];

  // Selecciones / Modales
  usuarioSeleccionado: Usuario | null = null;
  usuarioAEliminar: Usuario | null = null;
  showModal = false;
  showConfirmModal = false;
  showDetailModal = false;

  // Filtros
  roleFilter: 'todos' | 1 | 2 = 'todos'; 
  searchTerm = '';

  // Scroll + highlight
  @ViewChild('scrollContainer', { read: ElementRef }) scrollContainer!: ElementRef<HTMLElement>;
  @ViewChildren('itemRow', { read: ElementRef }) itemRows!: QueryList<ElementRef<HTMLElement>>;

  constructor(
    private usuarioService: UsuarioService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.obtenerUsuarios();
  }

  // -------- Utilidades ----------
  trackById = (_: number, it: Usuario) => it.id;

  // Soporta undefined para evitar NG5 cuando el template aún no tiene dato
  obtenerNombreRol(rol?: number): string {
    switch (Number(rol)) {
      case 1: return 'Administrador';
      case 2: return 'Usuario';
      default: return 'Usuario';
    }
  }

  // -------- CRUD / UI ----------
  obtenerUsuarios(): void {
    this.usuarioService.getAll().subscribe({
      next: (res: Usuario[]) => {
        const list = Array.isArray(res) ? res : [];
        // Deja el admin (id=1) primero
        this.usuarios = list.sort((a, b) => (a.id === 1 ? -1 : b.id === 1 ? 1 : 0));
        this.applyFilters();
      },
      error: () => {
        this.usuarios = [];
        this.filteredUsuarios = [];
      }
    });
  }

  abrirModal(): void {
    this.usuarioSeleccionado = null;
    this.showModal = true;
  }

  cerrarModal(): void {
    this.showModal = false;
    this.obtenerUsuarios();
  }

  abrirEditar(usuario: Usuario): void {
    this.usuarioSeleccionado = usuario;
    this.showModal = true;
  }

  mostrarDetalles(usuario: Usuario): void {
    this.usuarioSeleccionado = usuario;
    this.showDetailModal = true;
  }

  cerrarDetalle(): void {
    this.showDetailModal = false;
  }

  openConfirmDelete(usuario: Usuario): void {
    this.usuarioAEliminar = usuario;
    this.showConfirmModal = true;
  }

  cancelarEliminacion(): void {
    this.usuarioAEliminar = null;
    this.showConfirmModal = false;
  }

  confirmarEliminacion(): void {
    const userId = this.authService.getUser()?.id;
    if (!userId || !this.usuarioAEliminar) {
      console.error('No se encontró el ID del usuario autenticado o no hay usuario a eliminar.');
      return;
    }
    if (this.usuarioAEliminar.id === 1) { // protegido
      this.cancelarEliminacion();
      return;
    }

    this.usuarioService.delete(this.usuarioAEliminar.id, userId).subscribe({
      next: () => {
        this.obtenerUsuarios();
        this.cancelarEliminacion();
      },
      error: () => this.cancelarEliminacion()
    });
  }

  onCreated(): void {
    this.obtenerUsuarios();
  }

  // =================== FILTROS ===================
  /** Match por usuario, nombre o apellidos (case-insensitive). Si term vacío → true */
  private matchRow(it: Usuario, term: string): boolean {
    const t = term?.trim().toLowerCase();
    if (!t) return true;
    return [it.usuario, it.nombre, it.apellidos]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(t));
  }

  applyFilters(): void {
    const byRole = this.roleFilter === 'todos'
      ? this.usuarios
      : this.usuarios.filter(u => Number(u.role) === Number(this.roleFilter));

    this.filteredUsuarios = byRole.filter(u => this.matchRow(u, this.searchTerm));
    this.cdr.detectChanges();
  }

  // =================== BUSCAR → SCROLL → RESALTAR ===================
  async buscarYResaltar(term: string, opts: { openDetails?: boolean } = {}) {
    const t = term?.trim();
    if (!t || !this.filteredUsuarios?.length) return;

    await Promise.resolve();
    this.cdr.detectChanges();

    const idx = this.filteredUsuarios.findIndex(u => this.matchRow(u, t));
    if (idx === -1) return;

    const el = this.itemRows.get(idx)?.nativeElement;
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('flash-highlight'); void el.offsetWidth;
    el.classList.add('flash-highlight');

    if (opts.openDetails) this.mostrarDetalles(this.filteredUsuarios[idx]);
  }
}
