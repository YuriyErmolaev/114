import { TestBed } from '@angular/core/testing';

import { EntitySelectService } from './entity-select.service';

describe('EntitySelectService', () => {
  let service: EntitySelectService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EntitySelectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
