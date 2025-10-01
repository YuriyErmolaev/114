import {Component, Inject, Input, PLATFORM_ID} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {FormGroup, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {isPlatformBrowser} from "@angular/common";

@Component({
  selector: 'app-media-uploader',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './media-uploader.component.html',
  styleUrl: './media-uploader.component.css'
})
export class MediaUploaderComponent {

  @Input() endpoint: string = '';

  @Input() form!: FormGroup;
  @Input() controlName!: string;

  description: string = '';

  constructor(
      private http: HttpClient,
      @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  selectImage() {
    if (isPlatformBrowser(this.platformId) || typeof document !== 'undefined') {
      const imageInput = document.getElementById('imageInput') as HTMLInputElement;
      imageInput.click();
    }
  }

  selectVideo() {
    if (isPlatformBrowser(this.platformId) || typeof document !== 'undefined') {
      const videoInput = document.getElementById('videoInput') as HTMLInputElement;
      videoInput.click();
    }
  }

  selectMarkdown() {
    if (isPlatformBrowser(this.platformId) || typeof document !== 'undefined') {
      const markdownInput = document.getElementById('markdownInput') as HTMLInputElement;
      markdownInput.click();
    }
  }


  onFileSelected(event: any, type: string) {
    if (isPlatformBrowser(this.platformId) || typeof document !== 'undefined') {
      const file = event.target.files[0];
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      if (file) {
        this.uploadFile(file, type, textarea);
      }

      if (type === 'markdown') {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          const markdown = e.target.result;
          this.insertAtCursor(textarea, markdown);
        };
        reader.readAsText(file);
      }
    }
  }

  uploadFile(file: File, type: string, textarea: HTMLTextAreaElement) {
    const formData = new FormData();
    formData.append('file', file);

    this.http.post(`${this.endpoint}/upload-file`, formData).subscribe((response: any) => {
      const url = response.url;

      let markdown: string = '';

      if (type === 'image')
        markdown = `![Image]({{ backendUrl }}/storage/{{ unitUuid }}/${file.name})\n\n`;

      if (type === 'video')
        markdown = `<video width="320" height="240" controls><source src="{{ backendUrl }}/storage/{{ unitUuid }}/${file.name}" type="video/mp4"></video>\n\n *`;


      this.insertAtCursor(textarea, markdown);
    });
  }

  insertAtCursor(ctrl: HTMLTextAreaElement, text: string) {
    const startPos = ctrl.selectionStart;
    const endPos = ctrl.selectionEnd;
    ctrl.value = ctrl.value.substring(0, startPos) + text + ctrl.value.substring(endPos, ctrl.value.length);

    ctrl.setSelectionRange(startPos + text.length, startPos + text.length);

    const event = new Event('input', { bubbles: true });
    ctrl.dispatchEvent(event);
  }


}
