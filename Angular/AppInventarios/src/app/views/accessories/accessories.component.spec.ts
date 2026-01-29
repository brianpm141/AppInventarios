import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccessoriesComponent } from './accessories.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AccessoryService } from '../../services/accessories/accessory.service';
import { of } from 'rxjs';

describe('AccessoriesComponent', () => {
  let component: AccessoriesComponent;
  let fixture: ComponentFixture<AccessoriesComponent>;
  let accessoryServiceSpy: jasmine.SpyObj<AccessoryService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('AccessoryService', ['getAll', 'delete']);

    await TestBed.configureTestingModule({
      declarations: [AccessoriesComponent],
      imports: [HttpClientTestingModule],
      providers: [{ provide: AccessoryService, useValue: spy }]
    }).compileComponents();

    accessoryServiceSpy = TestBed.inject(AccessoryService) as jasmine.SpyObj<AccessoryService>;
    accessoryServiceSpy.getAll.and.returnValue(of([]));
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccessoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create AccessoriesComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should call getAll on init', () => {
    expect(accessoryServiceSpy.getAll).toHaveBeenCalled();
  });
});