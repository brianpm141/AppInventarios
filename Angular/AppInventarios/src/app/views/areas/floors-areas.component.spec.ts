import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FloorsAreasComponent } from './floors-areas.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormAreaComponent } from './form/formarea.component';
import { FormFloorComponent } from './form/formfloor.component';
import { CommonModule } from '@angular/common';

describe('FloorsAreasComponent', () => {
  let component: FloorsAreasComponent;
  let fixture: ComponentFixture<FloorsAreasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloorsAreasComponent, FormAreaComponent, FormFloorComponent, HttpClientTestingModule, CommonModule]
    }).compileComponents();

    fixture = TestBed.createComponent(FloorsAreasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty arrays', () => {
    expect(component.areas).toEqual([]);
    expect(component.pisos).toEqual([]);
  });

  it('should show success message on success', () => {
    component.mostrarMensaje('success', 'Todo bien');
    expect(component.showMessage).toBeTrue();
    expect(component.messageType).toBe('success');
  });
});