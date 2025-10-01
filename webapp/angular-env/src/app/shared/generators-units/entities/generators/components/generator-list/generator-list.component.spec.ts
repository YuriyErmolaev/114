import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneratorListComponent } from './generator-list.component';

describe('GeneratorListComponent', () => {
  let component: GeneratorListComponent;
  let fixture: ComponentFixture<GeneratorListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneratorListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneratorListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
