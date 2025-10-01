import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlendShapesChartComponent } from './blend-shapes-chart.component';

describe('BlendShapesChartComponent', () => {
  let component: BlendShapesChartComponent;
  let fixture: ComponentFixture<BlendShapesChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlendShapesChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlendShapesChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
