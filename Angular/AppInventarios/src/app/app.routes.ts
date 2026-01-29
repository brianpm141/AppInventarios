import { Routes } from '@angular/router';

import { BuildingComponent } from './views/building/building.component';
import { NotfoundComponent } from './views/notfound/notfound.component';
import { HomepageComponent } from './views/homepage/homepage.component';
import { DepartmentsComponent } from './views/departments/departments.component';
import { UsuariosComponent } from './views/usuarios/usuarios.component';
import { SettingsComponent } from './views/settings/settings.component';
import { HistoryComponent } from './views/history/history.component';
import { LogginComponent } from './views/loggin/loggin.component';
import { StadisticsComponent } from './views/stadistics/stadistics.component';
import { UnauthorizedComponent } from './views/unauthorized/unauthorized.component';
import { DevicesComponent } from './views/devices/devices.component';
import { FormatosComponent } from './views/formatos/formatos.component';
import { AccessoriesComponent } from './views/accessories/accessories.component'; 
import { FloorsAreasComponent } from './views/areas/floors-areas.component';


import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: 'building', component: BuildingComponent, title: 'En construcción', canActivate: [authGuard] },

  { path: 'homepage', component: HomepageComponent, title: 'Inicio', canActivate: [authGuard] },

  { path: 'departments', component: DepartmentsComponent, title: 'Departamentos', canActivate: [authGuard, roleGuard([1, 2, 3])] },
  { path: 'departments/view/:id', component: DepartmentsComponent, title: 'Detalle de Departamento', canActivate: [authGuard, roleGuard([1, 2, 3])] },

  { path: 'areas', component: FloorsAreasComponent, title: 'Pisos y Áreas', canActivate: [authGuard, roleGuard([1, 2, 3])] },
  { path: 'areas/view/:id', component: FloorsAreasComponent, title: 'Detalle de los pisos y áreas', canActivate: [authGuard, roleGuard([1, 2, 3])] },

  { path: 'usuarios', component: UsuariosComponent, title: 'Usuarios', canActivate: [authGuard, roleGuard([1])] },

  { path: 'settings', component: SettingsComponent, title: 'Configuración', canActivate: [authGuard] },
  { path: 'settings/view/:id', component: SettingsComponent, title: 'Detalle de categoría', canActivate: [authGuard] },

  { path: 'history', component: HistoryComponent, title: 'Historial', canActivate: [authGuard, roleGuard([1])] },

  { path: 'devices', component: DevicesComponent, title: 'Equipos', canActivate: [authGuard, roleGuard([1, 2, 3])] },
  { path: 'devices/view/:id', component: DevicesComponent, title: 'Detalle del equipo', canActivate: [authGuard, roleGuard([1, 2, 3])] },

  { path: 'accessories', component: AccessoriesComponent, title: 'Accesorios', canActivate: [authGuard, roleGuard([1, 2, 3])] },
  { path: 'accessories/view/:id', component: AccessoriesComponent, title: 'Detalle del accesorio', canActivate: [authGuard, roleGuard([1, 2, 3])] },

  { path: 'login', component: LogginComponent, title: 'Login' },
  { path: 'unauthorized', component: UnauthorizedComponent, title: 'Advertencia' },

  { path: 'stadistics', component: StadisticsComponent, title: 'Estadísticas', canActivate: [authGuard, roleGuard([1, 2, 3])] },

  { path: 'formatos', component: FormatosComponent, title: 'Formatos', canActivate: [authGuard, roleGuard([1, 2])] },

  { path: '', component: HomepageComponent, title: 'Inicio' },
  { path: '**', component: NotfoundComponent, title: 'Error' },
];
