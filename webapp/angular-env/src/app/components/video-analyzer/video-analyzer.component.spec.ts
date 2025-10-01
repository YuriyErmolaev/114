import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoAnalyzerComponent } from './video-analyzer.component';

describe('VideoAnalyzerComponent', () => {
  let component: VideoAnalyzerComponent;
  let fixture: ComponentFixture<VideoAnalyzerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoAnalyzerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoAnalyzerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
