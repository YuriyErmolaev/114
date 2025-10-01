import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlendShapesPickerComponent } from './blend-shapes-picker.component';

describe('BlendShapesPickerComponent', () => {
  let component: BlendShapesPickerComponent;
  let fixture: ComponentFixture<BlendShapesPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlendShapesPickerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlendShapesPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
