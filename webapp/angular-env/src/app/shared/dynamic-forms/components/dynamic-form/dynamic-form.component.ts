import {Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {KeyValuePipe, NgForOf, NgIf} from "@angular/common";
import {HttpClient} from "@angular/common/http";
import {MediaUploaderComponent} from "../media-uploader/media-uploader.component";
import {MatDialogRef} from "@angular/material/dialog";

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    KeyValuePipe,
    NgIf,
    NgForOf,
    MediaUploaderComponent
  ],
  templateUrl: './dynamic-form.component.html',
  styleUrl: './dynamic-form.component.css'
})
export class DynamicFormComponent {
  @Input() schema: {
    properties: {
      [key: string]: {
        title: string,
        type: string | 'textarea' | 'select',
        minLength?: number,
        minimum?: number,
        options?: { label: string, value: string }[],
        'ui:widget'?: string,
        default?: any,
        enum?: any[]
      }
    },
    required?: string[]
  } = { properties: {} };

  @Input() endpoint!: string;
  @Input() requestType: string = 'POST';
  @Input() item?: any;
  @Input() selects?: { fieldName: string, values: any[] }[];
  @Input() dialogRef?: MatDialogRef<any>;
  @Input() endpointAddition?: string;




  form!: FormGroup;

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    //cl_//comment console.log('Endpoint from dynamic form component from init:', this.endpoint);
    //cl_//comment console.log('item from dynamic form component from init:', this.item);
    this.buildForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schema'] || changes['item']) {
      //comment console.log('Schema or item changed');
      this.buildForm();
    }
  }

  buildForm() {
    const controls: { [key: string]: any } = {};

    Object.keys(this.schema.properties).forEach(key => {

      //cl_//comment console.log(`Key: ${key}, Value in item: ${this.item ? this.item[key] : 'undefined'}`);


      const field = this.schema.properties[key];
      const validators = [];

      if (field.minLength) {
        validators.push(Validators.minLength(field.minLength));
      }

      if (field.minimum) {
        validators.push(Validators.min(field.minimum));
      }

      if (this.schema.required && this.schema.required.includes(key)) {
        validators.push(Validators.required);
      }

      // controls[key] = field.type === 'file' ? [null] : [this.item ? this.item[key] : null, validators];

      controls[key] = field.type === 'file' ? [null] : [this.item ? this.item[key] : '', validators];


      // const defaultValue = field.default !== undefined ? field.default : (this.item ? this.item[key] : null);

      // const defaultValue = field.default !== undefined ? field.default : (this.item ? this.item[key] : '');
      const defaultValue = this.item && this.item[key] !== undefined ? this.item[key] : (field.default !== undefined ? field.default : '');


      controls[key] = [defaultValue, validators];


      if (field.type === 'select' && this.selects) {

        //cl_//comment console.log('this.selects from dynamic form component: ', this.selects);

        const selectField = this.selects.find(select => select.fieldName === key);
        if (selectField) {
          field.options = selectField.values;
        }
      }


    });

    this.form = this.fb.group(controls);
  }

  onFileChange(event: any, key: string) {
    const file = event.target.files[0];
    this.form.get(key)?.setValue(file);
  }


  onSubmit() {
    if (this.form.valid) {
      const formData = new FormData();

      Object.keys(this.form.controls).forEach(key => {
        const control = this.form.get(key);
        if (this.schema.properties[key].type === 'file' && control?.value) {
          formData.append(key, control.value);
        } else if (control?.value) {
          formData.append(key, control.value);
        }
      });

      //cl_//comment console.log('form data: ');
      formData.forEach((value, key) => {
        //cl_//comment console.log(key, value);
      });



      let request;

      //cl_//comment console.log('Endpoint from dynamic form component from submit:', this.endpoint);


      switch (this.requestType.toUpperCase()) {
        case 'GET':
          request = this.http.get(this.endpoint, { params: this.form.value });
          break;
        case 'POST':
          const fullPostEndpoint = this.endpointAddition ? `${this.endpoint}/${this.endpointAddition}` : this.endpoint;
          request = this.http.post(fullPostEndpoint, formData);
          break;
        case 'PUT':
          request = this.http.put(`${this.endpoint}/${this?.item.uuid}`, formData);
          break;
        case 'DELETE':
          //cl_//comment console.log('this.endpoint when del: ', this.endpoint);
          request = this.http.delete(`${this.endpoint}/${this?.item.uuid}`, { params: this.form.value });
          break;
        default:
          console.error('Unsupported request type');
          return;
      }

      request.subscribe({
        next: (response) => {
          //cl_//comment console.log('Request successful', response);
          this.dialogRef?.close(response);
        },
        error: (error) => {
          console.error('Error making request', error);
        }
      });
    }
  }



}



