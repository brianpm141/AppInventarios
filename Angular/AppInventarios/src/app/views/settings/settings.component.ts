import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExportdbComponent } from './exportdb/exportdb.component';
import { ImportdbComponent } from './importdb/importdb.component';
import { BuildingComponent } from '../building/building.component';
import { ProgrespComponent } from './progresp/progresp.component';
import { CategoriesComponent } from './categories/categories.component';
import { AuthService } from '../../services/auth/auth.service';
import { ActivatedRoute } from '@angular/router';
import { CategoriesService } from '../../services/categories/categories.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ExportdbComponent, ImportdbComponent, BuildingComponent, ProgrespComponent, CategoriesComponent],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
})
export class SettingsComponent {
  opcion: string = '';
  role: number | null = null;
  showLogoutConfirm: boolean = false;  // Controla la visibilidad del modal de confirmación

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private categoriesService: CategoriesService
  ) {
    const user = this.authService.getUser();
    this.role = user?.role ?? null;

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.opcion = 'categorias'; // Activa la vista de categorías si el id está presente en la URL
    }
  }

  // Función para abrir el modal de confirmación de cerrar sesión
  openLogoutConfirm() {
    this.showLogoutConfirm = true;  // Muestra el modal de confirmación
  }

  // Función para confirmar el cierre de sesión
  confirmLogout() {
    this.authService.logout();  // Llama al servicio para cerrar sesión
    this.showLogoutConfirm = false;  // Cierra el modal
  }

  // Función para cancelar el cierre de sesión
  cancelLogout() {
    this.showLogoutConfirm = false;  // Cierra el modal sin realizar ninguna acción
  }
}
