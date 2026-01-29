import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AccessoriesManagerService } from '../../../services/accessories/accessories-manager.service';
import { ReportsService } from '../../../services/reports/reports.service';
import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';

interface Accesorio {
  brand: string;
  product_name: string;
  category: string;
  total: number;
}

interface ResumenCategoria {
  id: number;
  name: string;
  total: number;
}

type StockFilter = 'all' | 'available' | 'low' | 'out';

@Component({
  selector: 'app-accsesories',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './accsesories.component.html',
  styleUrls: ['./accsesories.component.css']
})
export class AccsesoriesComponent implements OnInit {
  accessoriesService = inject(AccessoriesManagerService);
  reportsService = inject(ReportsService);

  // Listas para trabajo
  accesorios: Accesorio[] = [];      // mostrado (aplica filtro stock)
  accesoriosBase: Accesorio[] = [];  // base por categorías (sin filtro stock)
  todosAccesorios: Accesorio[] = [];
  accesoriosAgotados: Accesorio[] = [];

  resumenCategorias: ResumenCategoria[] = [];
  selectedCategories: Record<number, boolean> = {};

  // Estado "Seleccionar todas"
  selectAll = false;
  indeterminate = false;

  // Radios del HTML (compatibilidad)
  stockFilter: StockFilter = 'all';
  // Filtro combinable (permite low+out, etc.)
  private selectedStock = new Set<Exclude<StockFilter, 'all'>>(['available', 'low', 'out']);

  // Stats
  stats: any = {};
  objectKeys = Object.keys;

  // UI mensajes
  showMessage = false;
  messageText = '';
  messageType: 'success' | 'error' = 'success';

  // Secciones
  seccionesVisibles = { alertas: true, agotados: true };

  ngOnInit(): void {
    this.cargarResumen();
  }

  // ====== Derivados / Totales ======
  get registrosSeleccionados(): number {
    return this.accesorios.length;
  }

  get unidadesTotalesSeleccionadas(): number {
    return this.accesorios.reduce((acc, a) => acc + (Number(a.total) || 0), 0);
  }

  get categoriasSeleccionadasTexto(): string {
    const ids = this.getSelectedCategoryIds();
    if (ids.length === 0) return 'Ninguna';
    return this.resumenCategorias.filter(c => ids.includes(c.id)).map(c => c.name).join(', ');
  }

  // ====== Carga de datos ======
  cargarResumen() {
    this.reportsService.getAccessoriesSummary().subscribe((res: any) => {
      this.resumenCategorias = res.categorias as ResumenCategoria[];
      this.stats.total = res.total;
      this.stats.categoriaMayor = res.categoria_mayor;
      this.stats.categoriaMenor = res.categoria_menor;

      this.reportsService.getAllAccessories().subscribe(
        (lista: Accesorio[]) => {
          this.todosAccesorios = lista;
          this.accesoriosAgotados = lista.filter(a => Number(a.total) === 0);

          this.stats.porAgotarse = lista.filter(a => Number(a.total) === 1).length;
          this.stats.agotados = this.accesoriosAgotados.length;

          this.stats.porcentajeAgotados = this.stats.total > 0
            ? Math.round((this.stats.agotados / this.stats.total) * 100)
            : 0;

          this.stats.porcentajePorAgotarse = this.stats.total > 0
            ? Math.round((this.stats.porAgotarse / this.stats.total) * 100)
            : 0;

          this.stats.alertasPorCategoria = {};
          lista.forEach(a => {
            const cat = a.category;
            if (!this.stats.alertasPorCategoria[cat]) {
              this.stats.alertasPorCategoria[cat] = { porAgotarse: 0, agotados: 0 };
            }
            const t = Number(a.total);
            if (t === 1) this.stats.alertasPorCategoria[cat].porAgotarse++;
            if (t === 0) this.stats.alertasPorCategoria[cat].agotados++;
          });

          // Selecciona todas las categorías por defecto
          this.toggleSelectAll(true);
        },
        () => this.mostrarMensaje('Error al calcular estadísticas globales', 'error')
      );
    }, () => this.mostrarMensaje('Error al cargar resumen', 'error'));
  }

  toggleSection(seccion: 'alertas' | 'agotados') {
    this.seccionesVisibles[seccion] = !this.seccionesVisibles[seccion];
  }

  // ====== Filtrado (categorías + stock) ======
  private applyStockFilter() {
    const base = this.accesoriosBase || [];

    if (this.selectedStock.size === 0) {
      this.accesorios = [];
      return;
    }

    this.accesorios = base.filter(a => {
      const t = Number(a.total);
      const isAvailable = t > 1;
      const isLow = t === 1;
      const isOut = t === 0;
      return (
        (isAvailable && this.selectedStock.has('available')) ||
        (isLow && this.selectedStock.has('low')) ||
        (isOut && this.selectedStock.has('out'))
      );
    });
  }

  // Radios del HTML -> set combinable
  onStockChange(value: StockFilter) {
    this.stockFilter = value;
    this.selectedStock.clear();
    if (value === 'all') {
      this.selectedStock.add('available').add('low').add('out');
    } else if (value === 'available') {
      this.selectedStock.add('available');
    } else if (value === 'low') {
      this.selectedStock.add('low');
    } else if (value === 'out') {
      this.selectedStock.add('out');
    }
    this.applyStockFilter();
  }

  // (opcional) activar low+out juntos desde un botón futuro
  selectAlerts() {
    this.selectedStock.clear();
    this.selectedStock.add('low').add('out');
    this.stockFilter = 'low';
    this.applyStockFilter();
  }

  loadAccessories() {
    const ids = this.getSelectedCategoryIds();
    if (ids.length === 0) {
      this.accesoriosBase = [];
      this.accesorios = [];
      return;
    }

    this.reportsService.getAccessoriesByCategories(ids).subscribe({
      next: (res: any) => {
        this.accesoriosBase = (res.accessories || []) as Accesorio[];
        this.applyStockFilter();
      },
      error: () => this.mostrarMensaje('Error al cargar accesorios', 'error')
    });
  }

  getSelectedCategoryIds(): number[] {
    return Object.keys(this.selectedCategories)
      .filter(id => this.selectedCategories[+id])
      .map(id => +id);
  }

  // ====== Seleccionar todas (tri-state) ======
  toggleSelectAll(checked: boolean) {
    this.selectAll = checked;
    this.indeterminate = false;
    this.resumenCategorias.forEach(c => (this.selectedCategories[c.id] = checked));
    this.loadAccessories();
  }

  onCategoryChange() {
    const total = this.resumenCategorias.length;
    const seleccionadas = this.resumenCategorias.filter(c => this.selectedCategories[c.id]).length;
    this.selectAll = total > 0 && seleccionadas === total;
    this.indeterminate = seleccionadas > 0 && seleccionadas < total;
    this.loadAccessories();
  }

  // ====== Exportaciones (desde la VISTA filtrada) ======
  export(format: 'csv' | 'excel') {
    // Exporta EXACTAMENTE lo que ves en this.accesorios (respeta categorías + stock)
    if (this.accesorios.length === 0) {
      this.mostrarMensaje('No hay datos para exportar', 'error');
      return;
    }

    if (format === 'csv') {
      this.exportCsvFromView();
    } else {
      this.exportExcelFromView();
    }
  }

  private buildViewRows(): string[][] {
    // Encabezados
    const rows: string[][] = [['Marca', 'Producto', 'Categoría', 'Total']];
    // Datos
    this.accesorios.forEach(a => {
      rows.push([
        a.brand ?? '',
        a.product_name ?? '',
        a.category ?? '',
        String(Number(a.total) || 0)
      ]);
    });
    // Fila de totales
    rows.push(['', '', 'Totales', String(this.unidadesTotalesSeleccionadas)]);
    return rows;
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private exportCsvFromView() {
    const rows = this.buildViewRows();
    const csv = rows
      .map(cols =>
        cols
          .map(v => {
            const s = String(v ?? '');
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(',')
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, 'accesorios.csv');
  }

  /**
   * Excel (compat): genera un .xls simple a partir de una tabla HTML.
   * Excel lo abre sin problemas y respeta acentos.
   */
  private exportExcelFromView() {
    const rows = this.buildViewRows();
    const tableHtml =
      `<table>` +
      rows
        .map((cols, idx) => {
          const tag = idx === 0 ? 'th' : 'td';
          const cells = cols
            .map(c => `<${tag} style="border:1px solid #ccc;padding:4px;">${this.escapeHtml(c)}</${tag}>`)
            .join('');
          return `<tr>${cells}</tr>`;
        })
        .join('') +
      `</table>`;

    const html =
      `<html><head><meta charset="UTF-8"></head><body>${tableHtml}</body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    this.downloadBlob(blob, 'accesorios.xls');
  }

  private escapeHtml(s: string) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ====== Exportación PDF (ya respeta la vista) ======
  exportPdf() {
    if (this.accesorios.length === 0) return;

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Reporte de Accesorios', 20, 16);

    doc.setFontSize(10);
    doc.text(`Categorías: ${this.categoriasSeleccionadasTexto}`, 20, 22);

    const headers = [['Marca', 'Producto', 'Categoría', 'Total']];
    const body: RowInput[] = this.accesorios.map(a => [
      a.brand, a.product_name, a.category, String(a.total)
    ]);

    const foot: RowInput[] = [[
      { content: 'Totales', colSpan: 3, styles: { halign: 'right' } },
      { content: `${this.unidadesTotalesSeleccionadas}`, styles: { halign: 'right' } }
    ]];

    autoTable(doc, {
      head: headers,
      body,
      foot,
      startY: 28,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [227, 242, 253], textColor: [0, 35, 75] },
      footStyles: { fillColor: [245, 245, 245] },
      didDrawPage: () => {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(9);
        doc.text(
          `Registros: ${this.registrosSeleccionados}  |  Unidades totales: ${this.unidadesTotalesSeleccionadas}`,
          20,
          pageHeight - 8
        );
      }
    });

    doc.save('accesorios.pdf');
  }

  // ====== Utilidades UI ======
  mostrarMensaje(texto: string, tipo: 'success' | 'error') {
    this.messageText = texto;
    this.messageType = tipo;
    this.showMessage = true;
    setTimeout(() => this.showMessage = false, 2500);
  }

  trackByAccesorio = (_: number, a: Accesorio) =>
    `${a.brand}|${a.product_name}|${a.category}|${a.total}`;

  trackByCategoria = (_: number, c: ResumenCategoria) => c.id;
}
