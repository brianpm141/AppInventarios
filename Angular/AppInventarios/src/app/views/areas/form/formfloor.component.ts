import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { FloorService } from '../../../services/floors/floor.service';

@Component({
  selector: 'app-formfloor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './formfloor.component.html',
  styleUrls: ['./formarea.component.css']
})
export class FormFloorComponent implements OnChanges {
  @Input() isVisible = false;
  @Input() floorToEdit: any = null;
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();
  @Output() restoreEvent = new EventEmitter<{ id: number, name: string }>();

  floorForm: FormGroup;
  mensajeError: string | null = null;
  mostrarErrorCampos = false;

  constructor(private fb: FormBuilder, private floorService: FloorService) {
    this.floorForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['floorToEdit'] && this.floorToEdit) {
      this.floorForm.patchValue({
        name: this.floorToEdit.name || '',
        description: this.floorToEdit.description || ''
      });
    } else if (changes['floorToEdit'] && !this.floorToEdit) {
      this.floorForm.reset();
    }
  }

  onSubmit() {
    this.mensajeError = null;
    this.mostrarErrorCampos = false;

    if (this.floorForm.invalid) {
      this.floorForm.markAllAsTouched();
      this.mostrarErrorCampos = true;
      return;
    }

    const data = this.floorForm.value;
    const action = this.floorToEdit
      ? this.floorService.update(this.floorToEdit.id, data)
      : this.floorService.create(data);

    action.subscribe({
      next: () => {
        this.created.emit();
        this.floorForm.reset();
        this.floorToEdit = null;
        this.mensajeError = null;
        this.mostrarErrorCampos = false;
      },
      error: (err) => {
        if (err.status === 409 && err.error?.reactivable) {
          this.restoreEvent.emit({ id: err.error.id, name: data.name });
          this.onClose();
        } else if (err.status === 409) {
          this.mensajeError = '⚠️ Ya existe un piso con ese nombre.';
        } else {
          this.mensajeError = '❌ Error al registrar piso';
        }
      }
    });
  }

  onClose() {
    this.closed.emit();
    this.floorForm.reset();
    this.floorToEdit = null;
    this.mensajeError = null;
    this.mostrarErrorCampos = false;
  }
}
