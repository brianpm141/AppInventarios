import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormaccessoriesComponent } from './formaccessories.component';
import { ReactiveFormsModule } from '@angular/forms';
import { AccessoryService } from '../../../../services/accessories/accessory.service';
import { of } from 'rxjs';

describe('FormaccessoriesComponent', () => {
  let component: FormaccessoriesComponent;
  let fixture: ComponentFixture<FormaccessoriesComponent>;
  let accessoryServiceSpy: jasmine.SpyObj<AccessoryService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('AccessoryService', ['create', 'update']);

    await TestBed.configureTestingModule({
      declarations: [FormaccessoriesComponent],
      imports: [ReactiveFormsModule],
      providers: [{ provide: AccessoryService, useValue: spy }]
    }).compileComponents();

    accessoryServiceSpy = TestBed.inject(AccessoryService) as jasmine.SpyObj<AccessoryService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FormaccessoriesComponent);
    component = fixture.componentInstance;
    component.isVisible = true;
    fixture.detectChanges();
  });

  it('should create FormaccessoriesComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should emit created event on submit (create)', () => {
    const testData = { brand: 'HP', product_name: 'Mouse', total: 5, category_id: 1 };
    component.form.setValue(testData);
    spyOn(component.created, 'emit');
    accessoryServiceSpy.create.and.returnValue(of({}));

    component.onSubmit();

    expect(component.created.emit).toHaveBeenCalledWith(true);
  });
});