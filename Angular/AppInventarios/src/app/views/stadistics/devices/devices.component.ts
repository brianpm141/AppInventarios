import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportsService } from '../../../services/reports/reports.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type FuncEstado = 'asignado' | 'resguardo' | 'baja';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './devices.component.html',
  styleUrls: ['./devices.component.css']
})
export class DevicesComponent implements OnInit {
  summary: any = null;
  selectedCategories: { [key: number]: boolean } = {};
  devices: any[] = [];

  // Filtros
  isNewFilter: 1 | 0 | null = null;              // 1 = nuevos, 0 = usados, null = todos
  funcFilter: FuncEstado | null = null;          // asignado | resguardo | baja | null

  constructor(private reportsService: ReportsService) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  // ---- Handlers de filtros (usados con (ngModelChange)) ----
  onFuncChange(value: FuncEstado | null): void {
    this.funcFilter = value;
    this.loadDevices();
  }

  onIsNewChange(value: 1 | 0 | null): void {
    this.isNewFilter = value;
    this.loadDevices();
  }

  // ---- Carga de resumen + selección por defecto de categorías ----
  loadSummary(): void {
    this.reportsService.getSummary().subscribe({
      next: (res: any) => {
        this.summary = res;
        res.categories?.forEach((cat: any) => (this.selectedCategories[cat.id] = true));
        this.loadDevices();
      },
      error: (err: any) => console.error('Error al cargar resumen', err)
    });
  }

  // ---- Consulta de dispositivos con filtros activos ----
  loadDevices(): void {
    const selectedIds = this.getSelectedCategoryIds();
    if (selectedIds.length === 0) {
      this.devices = [];
      return;
    }

    const body: any = { categories: selectedIds };
    if (this.isNewFilter !== null) body.is_new = this.isNewFilter;
    if (this.funcFilter !== null) body.func = this.funcFilter;

    // DEBUG: quitar en producción
    console.log('[Reports] body enviado:', body);

    this.reportsService.getDevicesList(body).subscribe({
      next: (res: any) => {
        // Fuerza nueva referencia para asegurar detección de cambios en *ngFor
        this.devices = Array.isArray(res.devices) ? [...res.devices] : [];
      },
      error: (err: any) => console.error('Error al cargar dispositivos', err)
    });
  }

  // ---- Exportaciones ----
  export(type: 'csv' | 'excel'): void {
    const selectedIds = this.getSelectedCategoryIds();
    if (selectedIds.length === 0) return;

    const exportFn =
      type === 'csv' ? this.reportsService.exportCsv : this.reportsService.exportExcel;

    const body: any = { categories: selectedIds };
    if (this.isNewFilter !== null) body.is_new = this.isNewFilter;
    if (this.funcFilter !== null) body.func = this.funcFilter;

    exportFn.call(this.reportsService, body).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `equipos.${type === 'csv' ? 'csv' : 'xlsx'}`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => console.error(`Error al exportar ${type}`, err)
    });
  }

  exportPdf(): void {
    const selectedIds = this.getSelectedCategoryIds();
    if (selectedIds.length === 0) return;

    const doc = new jsPDF();

    const fecha = new Date();
    const fechaTexto = fecha.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    doc.setFontSize(14);
    doc.text('Listado de Equipos', 14, 10);
    doc.setFontSize(10);
    doc.text(`Fecha de reporte: ${fechaTexto}`, 14, 16);

    const body = this.devices.map(dev => [
      dev.brand,
      dev.model,
      dev.serial_number,
      dev.category,
      dev.func ? String(dev.func).toUpperCase() : 'N/A'
    ]);

    autoTable(doc, {
      head: [['Marca', 'Modelo', 'Serie', 'Categoría', 'Estado']],
      body,
      startY: 20
    });

    doc.save('equipos.pdf');
  }

  // ---- Utilidades ----
  getSelectedCategoryIds(): number[] {
    return Object.keys(this.selectedCategories)
      .filter(id => this.selectedCategories[parseInt(id, 10)])
      .map(id => parseInt(id, 10));
  }

  // trackBy para mejorar render y evitar parpadeos al refrescar
  trackBySerial = (_: number, d: any) => d?.serial_number ?? d?.id ?? _;
}
