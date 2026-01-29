import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormdevicesComponent } from './formdevices.component';

describe('FormdevicesComponent', () => {
  let component: FormdevicesComponent;
  let fixture: ComponentFixture<FormdevicesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormdevicesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormdevicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
