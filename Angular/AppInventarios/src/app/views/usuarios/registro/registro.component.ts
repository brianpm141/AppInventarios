import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, SimpleChanges, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder,
  FormGroup, Validators
} from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { UsuarioService } from '../../../services/usuarios/usuario.service';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css']
})
export class RegistroComponent implements OnInit, OnChanges {
  @Input() isVisible = false;
  @Input() usuarioToEdit: any = null;
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<boolean>();

  fb = inject(FormBuilder);
  usuarioService = inject(UsuarioService);
  authService = inject(AuthService);

  registroForm!: FormGroup;
  mostrarMensajeRegistro = false;
  mostrarErrorCampos = false;
  messageText = '';

  mostrarContrasena = false;
  mostrarConfirmar = false;

  mensajeExito = false;
  mensajeError = false;


  ngOnInit(): void {
    this.inicializarFormulario();
    if (this.usuarioToEdit) {
      setTimeout(() => this.cargarDatosUsuario());
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['usuarioToEdit'] && this.usuarioToEdit && this.registroForm) {
      setTimeout(() => this.cargarDatosUsuario());
    }
  }

  inicializarFormulario(): void {
    this.registroForm = this.fb.group({
      nombre: ['', Validators.required],
      apellidos: ['', Validators.required],
      usuario: ['', Validators.required],
      rol: ['', Validators.required],
      contrasena: ['', [
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[A-Z])(?=.*[\W_]).{6,}$/)
      ]],
      confirmar: ['', [
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[A-Z])(?=.*[\W_]).{6,}$/)
      ]]
    });
  }

  private cargarDatosUsuario(): void {
    if (this.usuarioToEdit && this.registroForm) {
      this.registroForm.patchValue({
        nombre: this.usuarioToEdit.nombre || '',
        apellidos: this.usuarioToEdit.apellidos || '',
        usuario: this.usuarioToEdit.usuario || '',
        rol: this.convertirANumero(this.usuarioToEdit.role)
      });

      this.registroForm.get('contrasena')?.clearValidators();
      this.registroForm.get('confirmar')?.clearValidators();
      this.registroForm.get('contrasena')?.updateValueAndValidity();
      this.registroForm.get('confirmar')?.updateValueAndValidity();
    }
  }

  get contraseniasCoinciden(): boolean {
    const pass = this.registroForm.get('contrasena')?.value;
    const confirm = this.registroForm.get('confirmar')?.value;
    return pass === confirm;
  }

registrarUsuario(): void {
  const contrasena = this.registroForm.get('contrasena')?.value;
  const contrasenasInvalidas = !this.contraseniasCoinciden && !this.usuarioToEdit;

  if (this.registroForm.invalid || contrasenasInvalidas) {
    this.mostrarErrorCampos = true;
    this.mensajeError = true;
    this.messageText = 'Por favor, llene todos los campos correctamente.';
    setTimeout(() => this.mensajeError = false, 2500);
    return;
  }

  const user = this.authService.getUser();
  const userId = user?.id;

  if (!userId) {
    this.mostrarErrorCampos = true;
    this.messageText = 'Error: usuario autenticado no disponible.';
    return;
  }

  const { nombre, apellidos, usuario, rol } = this.registroForm.value;

  if (this.usuarioToEdit) {
    const updatePayload: any = { nombre, apellidos, usuario, rol, userId };
    if (contrasena && contrasena.trim() !== '') {
      updatePayload.contrasena = contrasena;
    }

    this.usuarioService.update(this.usuarioToEdit.id, updatePayload).subscribe(() => {
      this.mensajeExito = true;
      this.created.emit(true);
      setTimeout(() => {
        this.mensajeExito = false;
        this.regresar();
      }, 2000);
    }, err => {
      this.mostrarErrorCampos = true;
      this.mensajeError = true;
      this.messageText = 'Error al actualizar usuario.';
      setTimeout(() => this.mensajeError = false, 2500);
    });

  } else {
    this.usuarioService.create({
      nombre,
      apellidos,
      usuario,
      rol,
      contrasena,
      userId
    }).subscribe(() => {
      this.mensajeExito = true;
      this.created.emit(true);
      setTimeout(() => {
        this.mensajeExito = false;
        this.regresar();
      }, 2000);
    }, err => {
      this.mostrarErrorCampos = true;
      this.mensajeError = true;
      this.messageText = err.status === 409
        ? (err.error?.message || 'El nombre de usuario ya está registrado.')
        : 'Error al registrar usuario.';
      setTimeout(() => this.mensajeError = false, 2500);
    });
  }
}

  regresar(): void {
    this.registroForm.reset();
    this.mostrarMensajeRegistro = false;
    this.mostrarErrorCampos = false;
    this.messageText = '';
    this.closed.emit();
  }

  private convertirANumero(valor: any): number {
    const num = Number(valor);
    return isNaN(num) ? 0 : num;
  }
}
