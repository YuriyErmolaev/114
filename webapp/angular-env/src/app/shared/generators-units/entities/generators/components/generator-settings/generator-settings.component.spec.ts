import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneratorSettingsComponent } from './generator-settings.component';

describe('GeneratorSettingsComponent', () => {
  let component: GeneratorSettingsComponent;
  let fixture: ComponentFixture<GeneratorSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneratorSettingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneratorSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
