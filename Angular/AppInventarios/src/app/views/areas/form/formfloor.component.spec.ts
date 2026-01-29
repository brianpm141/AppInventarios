import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormFloorComponent } from './formfloor.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';

describe('FormFloorComponent', () => {
  let component: FormFloorComponent;
  let fixture: ComponentFixture<FormFloorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormFloorComponent, HttpClientTestingModule, ReactiveFormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(FormFloorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the form component', () => {
    expect(component).toBeTruthy();
  });

  it('should have invalid form when empty', () => {
    expect(component.floorForm.valid).toBeFalsy();
  });

  it('should validate form with correct input', () => {
    component.floorForm.setValue({ name: 'PB', description: 'Planta baja' });
    expect(component.floorForm.valid).toBeTrue();
  });
});