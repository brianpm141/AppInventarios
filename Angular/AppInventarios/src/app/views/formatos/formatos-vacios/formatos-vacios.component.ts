import { Component } from '@angular/core';
import { DownloadService } from '../../../services/utilities/download.service';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-formatos-vacios',
  standalone: true,
  templateUrl: './formatos-vacios.component.html',
  styleUrls: ['./formatos-vacios.component.css']
})
export class FormatossVaciosComponent {
  constructor(private downloadService: DownloadService) {}

  descargarFormato(nombreArchivo: string) {
    this.downloadService.descargarFormato(nombreArchivo).subscribe(blob => {
      saveAs(blob, nombreArchivo);
    });
  }
}
