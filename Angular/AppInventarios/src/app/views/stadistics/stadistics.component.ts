import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DevicesComponent } from './devices/devices.component';
import { BuildingComponent } from '../building/building.component';
import { AccsesoriesComponent } from './accsesories/accsesories.component';

@Component({
  selector: 'app-stadistics',
  standalone: true,
  imports: [CommonModule, DevicesComponent, BuildingComponent, AccsesoriesComponent],
  templateUrl: './stadistics.component.html',
  styleUrl: './stadistics.component.css'
})
export class StadisticsComponent {
  opcion: string = 'devices';

  selectView(view: string) {
    this.opcion = view;
  }
}
