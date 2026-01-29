import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms'; 
import { HttpClientModule } from '@angular/common/http';
import { AreaService } from '../../../services/areas/area.service';

@Component({
  selector: 'app-formarea',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './formarea.component.html',
  styleUrls: ['./formarea.component.css']
})
export class FormAreaComponent implements OnInit {
  @Input() isVisible = false;
  @Input() areaToEdit: any = null;
  @Input() pisos: any[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<boolean>();
  @Output() restoreEvent = new EventEmitter<{ id: number, name: string }>();

  areaForm: FormGroup;
  mostrarErrorCampos = false;
  mensajeErrorDuplicado: string = '';

  constructor(private fb: FormBuilder, private areaService: AreaService) {
    this.areaForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      id_floor: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.areaToEdit) {
      this.areaForm.patchValue({
        name: this.areaToEdit.name,
        description: this.areaToEdit.description,
        id_floor: this.areaToEdit.id_floor
      });
    }
  }

  onSubmit() {
    this.mostrarErrorCampos = false;
    this.mensajeErrorDuplicado = '';

    if (this.areaForm.invalid) {
      this.mostrarErrorCampos = true;
      this.areaForm.markAllAsTouched();
      return;
    }

    const nombre = this.areaForm.value.name.trim();
    const idFloor = this.areaForm.value.id_floor;
    const descripcion = this.areaForm.value.description.trim();

    if (!this.areaToEdit) {
      const nuevaArea = { name: nombre, id_floor: idFloor, description: descripcion };
      this.areaService.create(nuevaArea).subscribe({
        next: () => {
          this.created.emit(true);
          this.onClose();
        },
        error: (err) => {
          if (err.status === 409 && err.error?.reactivable) {
            // Emitir evento para restaurar
            this.restoreEvent.emit({ id: err.error.id, name: nombre });
            this.onClose();
          } else if (err.status === 409) {
            this.mensajeErrorDuplicado = 'Ya existe un área con ese nombre.';
          } else {
            this.mensajeErrorDuplicado = 'Error al registrar el área.';
          }
        }
      });
    } else {
      const originalName = this.areaToEdit.name.trim();
      if (originalName.toLowerCase() !== nombre.toLowerCase()) {
        this.areaService.checkNameExists(nombre).subscribe((existe: boolean) => {
          if (existe) {
            this.mensajeErrorDuplicado = 'Ya existe un área con ese nombre.';
            return;
          }
          this.actualizarArea(nombre, idFloor, descripcion);
        });
      } else {
        this.actualizarArea(nombre, idFloor, descripcion);
      }
    }
  }

  actualizarArea(nombre: string, idFloor: number, descripcion: string) {
    const actualizada = {
      id: this.areaToEdit.id,
      name: nombre,
      id_floor: idFloor,
      description: descripcion
    };

    this.areaService.update(this.areaToEdit.id, actualizada).subscribe(() => {
      this.created.emit(true);
      this.onClose();
    });
  }

  onClose() {
    this.closed.emit();
  }
}
