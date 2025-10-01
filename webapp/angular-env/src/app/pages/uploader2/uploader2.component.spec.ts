import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Uploader2Component } from './uploader2.component';

describe('Uploader2Component', () => {
  let component: Uploader2Component;
  let fixture: ComponentFixture<Uploader2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Uploader2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Uploader2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
