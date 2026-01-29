
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormAreaComponent } from './formarea.component';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('FormAreaComponent', () => {
  let component: FormAreaComponent;
  let fixture: ComponentFixture<FormAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormAreaComponent],
      imports: [ReactiveFormsModule, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(FormAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the form', () => {
    expect(component).toBeTruthy();
    expect(component.areaForm).toBeDefined();
  });
});
