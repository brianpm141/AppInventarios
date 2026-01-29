import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsuariosComponent } from './usuarios.component';
import { UsuarioService } from 'app/services/usuarios/usuario.service';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { RegistroComponent } from './registro.component'; // solo si es standalone y se importa directo

describe('UsuariosComponent', () => {
  let component: UsuariosComponent;
  let fixture: ComponentFixture<UsuariosComponent>;
  let usuarioServiceSpy: jasmine.SpyObj<UsuarioService>;

  beforeEach(async () => {
    usuarioServiceSpy = jasmine.createSpyObj('UsuarioService', ['obtenerUsuarios', 'eliminarUsuario']);

    await TestBed.configureTestingModule({
      imports: [UsuariosComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        { provide: UsuarioService, useValue: usuarioServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UsuariosComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe llamar obtenerUsuarios al iniciar', () => {
    usuarioServiceSpy.obtenerUsuarios.and.returnValue(of([]));
    component.ngOnInit();
    expect(usuarioServiceSpy.obtenerUsuarios).toHaveBeenCalled();
  });

  it('debe llamar obtenerUsuarios al ejecutar onCreated()', () => {
    usuarioServiceSpy.obtenerUsuarios.and.returnValue(of([]));
    component.onCreated();
    expect(usuarioServiceSpy.obtenerUsuarios).toHaveBeenCalled();
  });
});
