import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, SimpleChanges, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AccessoryService } from '../../../services/accessories/accessory.service';
import { CategoriesService } from '../../../services/categories/categories.service';

@Component({
  selector: 'app-formaccessories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './formaccessories.component.html',
  styleUrls: ['./formaccessories.component.css']
})
export class FormaccessoriesComponent implements OnInit, OnChanges {
  @Input() isVisible = false;
  @Input() accessoryToEdit: any = null;
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<boolean>();

  fb = inject(FormBuilder);
  accessoriesService: AccessoryService = inject(AccessoryService);
  categoriesService = inject(CategoriesService);

  form!: FormGroup;
  categorias: any[] = [];

  showMessage = false;
  messageType: 'success' | 'error' = 'success';
  messageText = '';

  confirmarDuplicado = false;
  nombreDuplicado = '';

  /** Validador: solo enteros (>= 0 lo valida min) */
  private integerValidator: ValidatorFn = (control: AbstractControl) => {
    const v = control.value;
    if (v === null || v === undefined || v === '') return null; // lo maneja required
    const n = Number(v);
    return Number.isInteger(n) ? null : { integer: true };
  };

  ngOnInit(): void {
    this.form = this.fb.group({
      brand: ['', Validators.required],
      product_name: ['', Validators.required],
      total: [0, [Validators.required, Validators.min(0), this.integerValidator]],
      category_id: [null, Validators.required],
      details: ['']
    });

    // Sanitizar en tiempo real: trunca a entero y fuerza >= 0
    this.form.get('total')!.valueChanges.subscribe((v) => {
      const n = Number(v);
      // Si no es número, no toques (deja que required dispare error)
      if (!Number.isFinite(n)) return;
      const sane = Math.max(0, Math.trunc(n));
      if (n !== sane) {
        this.form.get('total')!.setValue(sane, { emitEvent: false });
      }
    });

    if (this.accessoryToEdit) {
      this.patchFromEdit();
    }

    this.cargarCategorias();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['accessoryToEdit'] && this.form) {
      if (this.accessoryToEdit) {
        this.patchFromEdit();
      } else {
        this.form.reset({
          brand: '',
          product_name: '',
          total: 0,
          category_id: null,
          details: ''
        });
      }
    }
  }

  private patchFromEdit() {
    const totalSafe = Math.max(0, Math.trunc(Number(this.accessoryToEdit.total ?? 0)));
    this.form.patchValue({
      brand: this.accessoryToEdit.brand,
      product_name: this.accessoryToEdit.product_name,
      total: totalSafe,
      category_id: this.accessoryToEdit.category_id,
      details: this.accessoryToEdit.details
    });
  }

  cargarCategorias(): void {
    this.categoriesService.getAccessoriesCategories().subscribe({
      next: (cats: any[]) => this.categorias = cats
    });
  }

  cerrar(): void {
    this.form.reset();
    this.confirmarDuplicado = false;
    this.closed.emit();
  }

  mostrarMensaje(tipo: 'success' | 'error', texto: string): void {
    this.messageType = tipo;
    this.messageText = texto;
    this.showMessage = true;
    setTimeout(() => (this.showMessage = false), 3000);
  }

  guardar(forzado = false): void {
    // Marca y valida
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach(c => c.markAsTouched());
      this.mostrarMensaje('error', 'Completa todos los campos obligatorios');
      return;
    }

    // Guard extra: que total sea entero >= 0
    const total = Number(this.form.value.total);
    if (!Number.isInteger(total) || total < 0) {
      this.mostrarMensaje('error', 'El total debe ser un número entero ≥ 0');
      this.form.get('total')?.setErrors({ integer: true });
      this.form.get('total')?.markAsTouched();
      return;
    }

    // Data listo
    const data = { ...this.form.value, total };

    const continuarGuardado = () => {
      if (this.accessoryToEdit) {
        this.accessoriesService.update(this.accessoryToEdit.id, data).subscribe({
          next: () => {
            this.mostrarMensaje('success', 'Accesorio actualizado correctamente');
            this.created.emit(true);
            setTimeout(() => this.cerrar(), 1000);
          },
          error: () => this.mostrarMensaje('error', 'Error al actualizar el accesorio')
        });
      } else {
        this.accessoriesService.create(data).subscribe({
          next: (res: { message: string; id: number }) => {
            this.mostrarMensaje('success', res.message);
            this.created.emit(true);
            setTimeout(() => this.cerrar(), 1000);
          },
          error: () => this.mostrarMensaje('error', 'Error al registrar el accesorio')
        });
      }
    };

    if (!this.accessoryToEdit && !forzado) {
      this.accessoriesService.checkNameExists(data.product_name).subscribe({
        next: (exists) => {
          if (exists) {
            this.nombreDuplicado = data.product_name;
            this.confirmarDuplicado = true;
          } else {
            continuarGuardado();
          }
        },
        error: () => this.mostrarMensaje('error', 'Error al verificar nombre del accesorio')
      });
    } else {
      continuarGuardado();
    }
  }

  continuarConDuplicado(): void {
    this.confirmarDuplicado = false;
    this.guardar(true);
  }

  cancelarDuplicado(): void {
    this.confirmarDuplicado = false;
  }
}
