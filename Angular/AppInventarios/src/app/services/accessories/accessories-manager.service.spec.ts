import { TestBed } from '@angular/core/testing';

import { AccessoriesManagerService } from './accessories-manager.service';

describe('AccessoriesManagerService', () => {
  let service: AccessoriesManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccessoriesManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
