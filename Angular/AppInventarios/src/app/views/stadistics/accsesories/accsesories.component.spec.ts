import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccsesoriesComponent } from './accsesories.component';

describe('AccsesoriesComponent', () => {
  let component: AccsesoriesComponent;
  let fixture: ComponentFixture<AccsesoriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccsesoriesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccsesoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
