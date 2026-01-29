import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EntregasComponent } from './entregas/entregas.component';
import { MantenimientosComponent } from './mantenimientos/mantenimientos.component';
import { BajasComponent } from './bajas/bajas.component';
import { UbicacionesComponent } from './ubicaciones/ubicaciones.component';
import { FormatossVaciosComponent } from './formatos-vacios/formatos-vacios.component';


@Component({
  selector: 'app-formatos',
  standalone: true,
  imports: [
    CommonModule,
    EntregasComponent,
    MantenimientosComponent,
    BajasComponent,
    UbicacionesComponent,
    FormatossVaciosComponent
  ],
  templateUrl: './formatos.component.html',
  styleUrl: './formatos.component.css'
})
export class FormatosComponent {
  opcion: string = '';
}
