import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { WizardLayoutComponent } from '../../../../../shared/wizard/wizard-layout.component';
import { WizardSummaryComponent, WizardSummaryItem } from '../../../../../shared/wizard/wizard-summary.component';

@Component({
  standalone: true,
  selector: 'app-offline-interview-wizard',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    WizardLayoutComponent,
    WizardSummaryComponent
  ],
  templateUrl: './offline-wizard.component.html',
  styleUrls: ['./offline-wizard.component.css']
})
export class OfflineInterviewWizardComponent implements OnInit {
  uploadForm: FormGroup;
  infoForm: FormGroup;
  metaForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.uploadForm = this.fb.group({
      fileName: ['', Validators.required]
    });

    this.infoForm = this.fb.group({
      title: ['', Validators.required],
      interviewer: ['']
    });

    this.metaForm = this.fb.group({
      location: [''],
      referenceId: ['']
    });
  }

  ngOnInit(): void {}

  onFileSelected(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    const file = input?.files && input.files.length ? input.files[0] : null;
    this.uploadForm.patchValue({ fileName: file ? file.name : '' });
    this.uploadForm.markAsDirty();
    this.uploadForm.updateValueAndValidity();
  }

  get summaryItems(): WizardSummaryItem[] {
    const u = this.uploadForm.value as { fileName?: string };
    const i = this.infoForm.value as { title?: string; interviewer?: string };
    const m = this.metaForm.value as { location?: string; referenceId?: string };
    return [
      { label: 'File', value: u.fileName },
      { separator: true },
      { label: 'Title', value: i.title },
      { label: 'Interviewer', value: i.interviewer },
      { separator: true },
      { label: 'Location', value: m.location },
      { label: 'Ref ID', value: m.referenceId }
    ];
  }

  onSubmit(): void {
    const allValid = this.uploadForm.valid && this.infoForm.valid && this.metaForm.valid;
    if (allValid) {
      const value = {
        ...this.uploadForm.value,
        ...this.infoForm.value,
        ...this.metaForm.value
      };
      console.log('Offline interview submit:', value);
    } else {
      this.uploadForm.markAllAsTouched();
      this.infoForm.markAllAsTouched();
      this.metaForm.markAllAsTouched();
    }
  }
}
