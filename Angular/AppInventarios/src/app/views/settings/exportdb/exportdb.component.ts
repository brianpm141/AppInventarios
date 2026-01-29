import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatabaseService } from '../../../services/database/database.service';

@Component({
  selector: 'app-exportdb',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exportdb.component.html',
  styleUrls: ['./exportdb.component.css']
})

export class ExportdbComponent {
  message = '';
  error = false;
  cargando = false; 


  constructor(private dbService: DatabaseService) {}

onExport(): void {
  if (this.cargando) return;

  this.cargando = true;
  this.message = '';

  this.dbService.export().subscribe({
    next: (blob: Blob) => {
      const fecha = new Date().toISOString().split('T')[0];
      const fileName = `BKP-${fecha}.sql.gz`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);

      this.error = false;
      this.message = 'Exportación exitosa.';
      this.cargando = false;
    },
    error: () => {
      this.error = true;
      this.message = 'Error al generar el backup.';
      this.cargando = false;
    }
  });
}

}
