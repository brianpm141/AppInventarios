import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
  ReactiveFormsModule
} from '@angular/forms';
import { DeviceService } from '../../../services/devices/device.service';

@Component({
  selector: 'app-formdevices',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './formdevices.component.html',
  styleUrls: ['./formdevices.component.css'],
  providers: [DeviceService]
})
export class FormdevicesComponent implements OnInit, OnChanges {
  @Input() isVisible: boolean = false;
  @Input() deviceToEdit: any = null;

  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<boolean>(); // true = éxito, false = error

  deviceForm: FormGroup;
  categorias: any[] = [];
  camposPersonalizados: any[] = [];

  constructor(private fb: FormBuilder, private deviceService: DeviceService) {
    this.deviceForm = this.fb.group({
      brand: ['', Validators.required],
      model: ['', Validators.required],
      serial_number: ['', Validators.required],
      category_id: [null, Validators.required],
      details: [''],
      is_new: [true]  // ✅ Inicializado como activo
    });
  }

  ngOnInit(): void {
    this.cargarCategorias();

    this.deviceForm.get('category_id')?.valueChanges.subscribe(categoryId => {
      if (categoryId) {
        this.cargarCamposPersonalizados(categoryId);
      } else {
        this.camposPersonalizados = [];
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible'] && this.isVisible) {
      this.deviceForm.reset({
        is_new: true // ✅ mantener activado por defecto al abrir el modal
      });
      this.camposPersonalizados = [];

      if (this.deviceToEdit) {
        this.deviceForm.patchValue({
          brand: this.deviceToEdit.brand,
          model: this.deviceToEdit.model,
          serial_number: this.deviceToEdit.serial_number,
          category_id: this.deviceToEdit.category_id,
          details: this.deviceToEdit.details || '',
          is_new: this.deviceToEdit.is_new === 1 // ✅ convertir a booleano
        });

        this.cargarCamposPersonalizados(
          this.deviceToEdit.category_id,
          this.deviceToEdit.custom_fields || []
        );
      }
    }
  }

  cargarCategorias(): void {
    this.deviceService.getCategories().subscribe({
      next: data => this.categorias = data,
      error: err => {
        console.error('Error al cargar categorías:', err);
        this.categorias = [];
      }
    });
  }

  cargarCamposPersonalizados(categoryId: number, existingValues: any[] = []): void {
    this.deviceService.getCustomFieldsByCategory(categoryId).subscribe({
      next: data => {
        this.camposPersonalizados = data;

        Object.keys(this.deviceForm.controls)
          .filter(key => key.startsWith('custom_'))
          .forEach(key => this.deviceForm.removeControl(key));

        for (const campo of data) {
          const controlName = `custom_${campo.id}`;
          const validators = campo.required ? [Validators.required] : [];

          const existingValue = existingValues.find(v => v.custom_field_id === campo.id);
          this.deviceForm.addControl(
            controlName,
            new FormControl(existingValue?.value || '', validators)
          );
        }
      },
      error: err => {
        console.error('Error al cargar campos personalizados:', err);
        this.camposPersonalizados = [];
      }
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  guardar(): void {
    if (this.deviceForm.invalid) {
      this.deviceForm.markAllAsTouched();
      return;
    }

    const formValue = this.deviceForm.value;

    const custom_values = this.camposPersonalizados.map(campo => ({
      custom_field_id: campo.id,
      value: formValue[`custom_${campo.id}`]
    }));

    const payload = {
      brand: formValue.brand,
      model: formValue.model,
      serial_number: formValue.serial_number,
      category_id: formValue.category_id,
      group_id: null,
      details: formValue.details,
      is_new: formValue.is_new ? 1 : 0,
      custom_values
    };

    if (this.deviceToEdit) {
      this.deviceService.update(this.deviceToEdit.id, payload).subscribe({
        next: () => {
          this.created.emit(true);
          this.cerrar();
        },
        error: err => {
          console.error('Error al actualizar dispositivo:', err);
          this.created.emit(false);
        }
      });
    } else {
      this.deviceService.create(payload).subscribe({
        next: () => {
          this.created.emit(true);
          this.cerrar();
        },
        error: err => {
          console.error('Error al registrar dispositivo:', err);
          this.created.emit(false);
        }
      });
    }
  }
}
