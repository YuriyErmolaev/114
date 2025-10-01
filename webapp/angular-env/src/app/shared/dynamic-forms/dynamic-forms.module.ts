import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {DynamicFormComponent} from "./components/dynamic-form/dynamic-form.component";
import {ReactiveFormsModule} from "@angular/forms";
import {provideHttpClient} from "@angular/common/http";

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DynamicFormComponent
  ],
  providers: [
    provideHttpClient()
  ],
  exports: [DynamicFormComponent]
})
export class DynamicFormsModule { }
