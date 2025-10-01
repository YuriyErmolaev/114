import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoDisplayControlsComponent } from './video-display-controls.component';

describe('VideoDisplayControlsComponent', () => {
  let component: VideoDisplayControlsComponent;
  let fixture: ComponentFixture<VideoDisplayControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoDisplayControlsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoDisplayControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
