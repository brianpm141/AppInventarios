import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UbicacionesService } from '../../../services/ubicaciones/ubicaciones.service';
import { DepartmentService } from '../../../services/departments/department.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-ubicaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ubicaciones.component.html',
  styleUrl: './ubicaciones.component.css'
})
export class UbicacionesComponent implements OnInit {

objectKeys = Object.keys;

  ubicaciones: any[] = [];
  departamentos: any[] = [];
  selectedDepartment: number | null = null;

  constructor(
    private ubicacionesService: UbicacionesService,
    private departmentService: DepartmentService
  ) {}

  ngOnInit(): void {
    this.cargarDepartamentos();
    this.cargarUbicaciones();
  }

  cargarDepartamentos() {
    this.departmentService.getDepartments().subscribe({
      next: (data: any) => this.departamentos = data,
      error: () => console.error('Error al cargar departamentos')
    });
  }

cargarUbicaciones(departmentId?: number) {
  this.ubicacionesService.getUbicaciones(departmentId).subscribe({
    next: (data: any) => {
      this.ubicaciones = (data || []).map((piso: any) => ({
        ...piso,
        expanded: false,
        areas: (piso.areas || []).map((area: any) => {
          const groupedByDept: any = {};

          (area.devices || []).forEach((device: any) => {
          const deptName = device.departamento?.trim() || 'Sin departamento';
          const folio = device.folio || 'Sin folio';
          const grupoKey = `${deptName} | ${folio}`;

          if (!groupedByDept[grupoKey]) {
            groupedByDept[grupoKey] = [];
          }

          groupedByDept[grupoKey].push(device);
        });

          return {
            ...area,
            expanded: false,
            groupedDevices: groupedByDept
          };
        })
      }));
    },
    error: () => console.error('Error al cargar ubicaciones')
  });
}

  isPisoSinDispositivos(piso: any): boolean {
  return piso.areas.every((area: any) => (area.devices.length === 0));
}

togglePiso(piso: any) {
  this.ubicaciones.forEach((p: any) => {
    if (p !== piso) p.expanded = false;
  });
  piso.expanded = !piso.expanded;
}

toggleArea(area: any, piso: any) {
  piso.areas.forEach((a: any) => {
    if (a !== area) a.expanded = false;
  });
  area.expanded = !area.expanded;
}

generarReporte() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  doc.setFontSize(18);
  doc.text('Reporte de Ubicaciones con Equipos', 40, 40);

  let y = 60;

  for (const piso of this.ubicaciones) {
    const areasConDispositivos = piso.areas.filter((a: any) => a.devices.length > 0);
    if (areasConDispositivos.length === 0) continue;

    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text(`Piso: ${piso.name}`, 40, y);
    y += 18;

    for (const area of areasConDispositivos) {
      doc.setFontSize(12);
      doc.text(`Área: ${area.name}`, 50, y);
      y += 16;

      for (const grupo of Object.keys(area.groupedDevices)) {
        doc.setFontSize(11);
        doc.setTextColor(60);
        doc.text(`Grupo: ${grupo}`, 60, y);
        y += 12;

        const body = area.groupedDevices[grupo].map((d: any) => [
          d.brand, d.model, d.serial_number, d.responsable
        ]);

        autoTable(doc, {
          head: [['Marca', 'Modelo', 'Serie', 'Responsable']],
          body,
          startY: y,
          theme: 'striped',
          styles: { fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: [0, 45, 91], halign: 'center' },
          margin: { left: 60, right: 40 },
          tableWidth: 'auto'
        });

        y = (doc as any).lastAutoTable.finalY + 20;

        if (y > 700) {
          doc.addPage();
          y = 40;
        }
      }
    }

    y += 10;
    if (y > 700) {
      doc.addPage();
      y = 40;
    }
  }

  doc.save('reporte_ubicaciones.pdf');
}

}
