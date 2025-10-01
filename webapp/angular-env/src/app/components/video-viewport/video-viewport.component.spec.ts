import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoViewportComponent } from './video-viewport.component';

describe('VideoViewportComponent', () => {
  let component: VideoViewportComponent;
  let fixture: ComponentFixture<VideoViewportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoViewportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoViewportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
