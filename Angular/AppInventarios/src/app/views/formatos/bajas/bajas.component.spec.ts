import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BajasComponent } from './bajas.component';

describe('BajasComponent', () => {
  let component: BajasComponent;
  let fixture: ComponentFixture<BajasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BajasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BajasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
