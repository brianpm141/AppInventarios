import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartmentService, Department } from '../../../services/departments/department.service';
import { UbicacionesService } from '../../../services/ubicaciones/ubicaciones.service';
import { MantenimientoService } from '../../../services/mantenimientos/mantenimientos.service';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-mantenimientos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mantenimientos.component.html',
  styleUrls: ['./mantenimientos.component.css']
})
export class MantenimientosComponent implements OnInit {
  objectKeys = Object.keys;

  selectedDepartment: number | null = null;
  departamentos: Department[] = [];
  ubicaciones: any[] = [];

  selectedPiso: any = null;
  selectedArea: any = null;
  selectedFolio: string = '';
  selectedGrupo: any[] = [];
  nombreResponsable: string = '';

  showModal = false;

  formMantenimiento = {
    responsable: '',
    resultado: '',
    hardware: false,
    software: false,
    descripcion_falla: '',
    descripcion_solucion: ''
  };

  constructor(
    private departmentService: DepartmentService,
    private ubicacionesService: UbicacionesService,
    private mantenimientosService: MantenimientoService,
    private authService: AuthService
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
      this.ubicaciones = (data || [])
        .map((piso: any) => ({
          ...piso,
          areas: (piso.areas || [])
            .map((area: any) => {
              const groupedByDept: any = {};

              (area.devices || []).forEach((device: any) => {
                const deptName = device.departamento?.trim() || 'Sin departamento';
                const folio = device.folio || 'Sin folio';
                const grupoKey = `${deptName} | ${folio}`;
                if (!groupedByDept[grupoKey]) groupedByDept[grupoKey] = [];

                groupedByDept[grupoKey].push(device);

                if (!groupedByDept[grupoKey].ultimo && device.ultimo) {
                  groupedByDept[grupoKey].ultimo = device.ultimo;
                  groupedByDept[grupoKey].completo = device.completo; // <--- guardamos aquí
                }
              });

              const primerGrupo = Object.keys(groupedByDept)[0];
              const primerDispositivo = groupedByDept[primerGrupo]?.[0];

              return {
                ...area,
                groupedDevices: groupedByDept,
                departamento: primerDispositivo?.departamento || 'Sin departamento'
              };
            })
            .filter((area: any) => Object.values(area.groupedDevices).some((g: any) => g.length > 0))
        }))
        .filter((piso: any) => piso.areas.length > 0);
    },
    error: () => console.error('Error al cargar ubicaciones')
  });
}


  isPisoSinDispositivos(piso: any): boolean {
    return piso.areas.every((area: any) => (area.devices?.length || 0) === 0);
  }

  abrirModalMantenimiento(piso: any, area: any, grupo: string): void {
    const devices = area.groupedDevices[grupo];
    this.selectedPiso = piso;
    this.selectedArea = area;
    this.selectedGrupo = devices;
    this.selectedFolio = devices[0].folio;
    this.nombreResponsable = devices[0].responsable;
    this.showModal = true;

    // Estado inicial checklist
    this.selectedGrupo.forEach(d => d.estado = 'pendiente');

    this.formMantenimiento = {
      responsable: this.nombreResponsable,
      resultado: '',
      hardware: false,
      software: false,
      descripcion_falla: '',
      descripcion_solucion: ''
    };
  }

  // True si TODOS los dispositivos están completos y ambos checkboxes marcados
  todosCompletos(): boolean {
    const todosDispositivosCompletos = this.selectedGrupo.every(d => d.estado === 'completo');
    const hardwareMarcado = this.formMantenimiento.hardware;
    const softwareMarcado = this.formMantenimiento.software;
    return todosDispositivosCompletos && hardwareMarcado && softwareMarcado;
  }

  // 1=completo, 0=parcial (según requisitos)
  calcularFlagCompleto(): number {
    return this.todosCompletos() ? 1 : 0;
  }

  getDeviceStatuses(): Array<{ id: number; estado: 'completo' | 'pendiente' }> {
    return this.selectedGrupo.map(d => ({ id: d.id, estado: d.estado }));
  }

  marcarEstado(dispositivo: any, event: Event): void {
    const input = event.target as HTMLInputElement;
    dispositivo.estado = input.checked ? 'completo' : 'pendiente';
  }

registrarMantenimiento(): void {
  const user = this.authService.getUser();
  const responsivaId = this.selectedGrupo?.[0]?.id_responsiva;

  if (!user) {
    alert('Usuario no autenticado');
    return;
  }
  if (!this.nombreResponsable.trim()) {
    alert('Responsable no definido');
    return;
  }

  // 1 = completo si todo el checklist + HW + SW; 0 = parcial en otro caso
  const completo = this.todosCompletos() ? 1 : 0;

  const payload: any = {
    responsiva_id: responsivaId,
    fecha: new Date().toISOString().split('T')[0],
    descripcion_falla: (this.formMantenimiento.descripcion_falla || '').trim(),
    descripcion_solucion: (this.formMantenimiento.descripcion_solucion || '').trim(),
    responsable: this.nombreResponsable.trim(),
    user_id: user.id,
    completo, // <- se guarda 1 o 0 según el estado del formulario
    // Contexto adicional (opcional para auditoría/cálculo en back)
    hardware: this.formMantenimiento.hardware,
    software: this.formMantenimiento.software,
    deviceStatuses: this.selectedGrupo.map(d => ({ id: d.id, estado: d.estado }))
  };

  this.mantenimientosService.registrarMantenimiento(payload).subscribe({
    next: (pdfBlob: Blob) => {
      // Servicio devuelve Blob directo (sin headers)
      const blob = new Blob([pdfBlob], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // Nombre de archivo sin depender de headers
      const folio = this.selectedFolio || 'sin_folio';
      const filename = `mantenimiento_${folio}.pdf`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      this.showModal = false;
      this.cargarUbicaciones(this.selectedDepartment || undefined);
    },
    error: () => {
      alert('Error al registrar mantenimiento');
    }
  });
}


}
