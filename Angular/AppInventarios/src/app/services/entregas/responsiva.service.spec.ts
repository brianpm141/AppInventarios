import { TestBed } from '@angular/core/testing';

import { ResponsivaService } from './responsiva.service';

describe('ResponsivaService', () => {
  let service: ResponsivaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResponsivaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
