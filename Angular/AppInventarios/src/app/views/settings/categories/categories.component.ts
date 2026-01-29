import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CategoriesService } from '../../../services/categories/categories.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.css']
})
export class CategoriesComponent implements OnInit {
  categories: any[] = [];
  categoryForm: FormGroup;
  customFieldForm: FormGroup;
  customFields: any[] = [];

  isEditing = false;
  editId: number | null = null;

  successMessage: string | null = null;
  errorMessage: string | null = null;
  confirmId: number | null = null;

  restoreCandidate: { id: number, name: string } | null = null;

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoriesService,
    private route: ActivatedRoute
  ) {
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      type: [0, Validators.required]
    });

    this.customFieldForm = this.fb.group({
      name: ['', Validators.required],
      data_type: ['text', Validators.required],
      required: [false]
    });
  }

  ngOnInit(): void {
    this.loadCategories();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.categoryService.getById(+id).subscribe({
        next: (cat: any) => this.editCategory(cat),
        error: () => this.showError('Categoría no encontrada')
      });
    }
  }

  loadCategories() {
    this.categoryService.getAll().subscribe({
      next: (data: any) => this.categories = data,
      error: () => this.showError('Error al cargar categorías')
    });
  }

  loadCustomFields(categoryId: number) {
    this.categoryService.getCustomFields(categoryId).subscribe({
      next: (data: any) => {
        this.customFields = data;
        this.customFields.forEach(field => {
          if (!this.categoryForm.contains(field.name)) {
            this.categoryForm.addControl(field.name, this.fb.control('', Validators.required));
          }
        });
      },
      error: () => this.showError('Error al cargar campos personalizados')
    });
  }

  addCustomField() {
    if (!this.editId || this.customFieldForm.invalid) return;

    const payload = {
      name: this.customFieldForm.value.name.trim(),
      data_type: this.customFieldForm.value.data_type,
      required: this.customFieldForm.value.required ? 1 : 0,
      category_id: this.editId
    };

    if (this.customFields.some(f => f.name === payload.name)) {
      this.showError('Este nombre de campo ya fue agregado.');
      return;
    }

    this.categoryService.createCustomField(payload).subscribe({
      next: () => {
        this.showSuccess('Campo personalizado agregado');
        this.customFieldForm.reset({ data_type: 'text', required: false });
        this.loadCustomFields(this.editId!);
      },
      error: () => this.showError('Error al agregar campo personalizado')
    });
  }

  submitForm() {
    if (this.categoryForm.invalid) return;

    const action = this.isEditing && this.editId !== null
      ? this.categoryService.update(this.editId, this.categoryForm.value)
      : this.categoryService.create(this.categoryForm.value);

    action.subscribe({
      next: () => {
        this.showSuccess(this.isEditing ? 'Categoría actualizada' : 'Categoría creada');
        this.resetForm();
        this.loadCategories();
      },
      error: (error) => {
        const mensaje = error.error?.error?.toLowerCase?.() || '';

        if (error.status === 409 && error.error?.restoreId) {
          this.restoreCandidate = {
            id: error.error.restoreId,
            name: this.categoryForm.value.name
          };
        } else if (mensaje.includes('ya existe') && mensaje.includes('categoría')) {
          this.showError('El nombre ya está en uso por otra categoría activa.');
        } else if (mensaje.includes('duplicate entry')) {
          this.showError('Ese nombre ya existe, intenta con otro.');
        } else {
          this.showError(error.error?.error || 'Error al guardar categoría');
        }
      }
    });
  }

  restaurarCategoria() {
    if (!this.restoreCandidate) return;

    this.categoryService.restoreCategory(this.restoreCandidate.id).subscribe({
      next: () => {
        this.showSuccess(`Categoría '${this.restoreCandidate?.name}' restaurada`);
        this.restoreCandidate = null;
        this.resetForm();
        this.loadCategories();
      },
      error: () => {
        this.showError('Error al restaurar categoría');
        this.restoreCandidate = null;
      }
    });
  }

  editCategory(category: any) {
    this.categoryForm.reset({ type: 0 });
    Object.keys(this.categoryForm.controls).forEach(key => {
      if (!['name', 'description', 'type'].includes(key)) {
        this.categoryForm.removeControl(key);
      }
    });

    this.categoryForm.patchValue({
      name: category.name,
      description: category.description,
      type: category.type
    });

    this.isEditing = true;
    this.editId = category.id;
    this.loadCustomFields(category.id);
  }

  confirmDelete(id: number) {
    this.confirmId = id;
  }

  deleteCategory(id: number) {
    this.categoryService.delete(id).subscribe({
      next: () => {
        this.showSuccess('Categoría eliminada');
        this.confirmId = null;
        this.loadCategories();
      },
      error: (error) => {
        this.confirmId = null;
        if (error.status === 409) {
          this.showError(error.error?.error || 'La categoría tiene elementos relacionados');
        } else {
          this.showError('Error al eliminar categoría');
        }
      }
    });
  }

  resetForm() {
  Object.keys(this.categoryForm.controls).forEach(key => {
    if (!['name', 'description', 'type'].includes(key)) {
      this.categoryForm.removeControl(key);
    }
  });

  this.categoryForm.reset({ type: 0 });
  this.categoryForm.get('type')?.enable(); // <--- importante

  this.customFieldForm.reset({ data_type: 'text', required: false });
  this.isEditing = false;
  this.editId = null;
  this.customFields = [];
}


  getTypeLabel(type: number): string {
    return type === 0 ? 'Equipos' : 'Accesorios';
  }

  showSuccess(msg: string) {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = null, 3000);
  }

  showError(msg: string) {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = null, 3000);
  }

  deleteCustomField(fieldId: number) {
    if (!confirm('¿Eliminar este campo personalizado?')) return;

    this.categoryService.deleteCustomField(fieldId).subscribe({
      next: () => {
        this.showSuccess('Campo personalizado eliminado');
        this.loadCustomFields(this.editId!);
      },
      error: () => this.showError('Error al eliminar campo personalizado')
    });
  }
}
