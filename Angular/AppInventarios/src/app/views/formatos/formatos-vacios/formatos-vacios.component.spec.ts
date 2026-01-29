import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormatosVaciosComponent } from './formatos-vacios.component';

describe('FormatosVaciosComponent', () => {
  let component: FormatosVaciosComponent;
  let fixture: ComponentFixture<FormatosVaciosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormatosVaciosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormatosVaciosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
