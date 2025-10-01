import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { WizardLayoutComponent } from '../../../../../shared/wizard/wizard-layout.component';
import { WizardSummaryComponent, WizardSummaryItem } from '../../../../../shared/wizard/wizard-summary.component';
import { AutofillSyncDirective } from '../../../../../shared/autofill-sync.directive';

@Component({
  standalone: true,
  selector: 'app-online-interview-wizard',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    WizardLayoutComponent,
    WizardSummaryComponent,
    AutofillSyncDirective
  ],
  templateUrl: './online-wizard.component.html',
  styleUrls: ['./online-wizard.component.css']
})
export class OnlineInterviewWizardComponent implements OnInit {
  stepOneForm: FormGroup;
  stepTwoForm: FormGroup;
  stepThreeForm: FormGroup;
  stepFourForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.stepOneForm = this.fb.group({
      title: ['', Validators.required],
      interviewer: ['', Validators.required],
      date: [null, Validators.required]
    });

    this.stepTwoForm = this.fb.group({
      notes: [''],
      tags: ['']
    });

    this.stepThreeForm = this.fb.group({
      cameraModel: [''],
      microphoneModel: ['']
    });

    this.stepFourForm = this.fb.group({
      location: [''],
      referenceId: ['']
    });
  }

  ngOnInit(): void {}

  get titleCtrl() { return this.stepOneForm.get('title'); }
  get interviewerCtrl() { return this.stepOneForm.get('interviewer'); }
  get dateCtrl() { return this.stepOneForm.get('date'); }

  get summaryItems(): WizardSummaryItem[] {
    const s1 = this.stepOneForm.value as { title?: string; interviewer?: string; date?: Date };
    const s2 = this.stepTwoForm.value as { notes?: string; tags?: string };
    const s3 = this.stepThreeForm.value as { cameraModel?: string; microphoneModel?: string };
    const s4 = this.stepFourForm.value as { location?: string; referenceId?: string };
    return [
      { label: 'Title', value: s1.title },
      { label: 'Interviewer', value: s1.interviewer },
      { label: 'Date', value: s1.date },
      { separator: true },
      { label: 'Notes', value: s2.notes, multiline: true },
      { label: 'Tags', value: s2.tags },
      { separator: true },
      { label: 'Camera', value: s3.cameraModel },
      { label: 'Mic', value: s3.microphoneModel },
      { separator: true },
      { label: 'Location', value: s4.location },
      { label: 'Ref ID', value: s4.referenceId }
    ];
  }

  onSubmit(): void {
    const allValid = this.stepOneForm.valid && this.stepTwoForm.valid && this.stepThreeForm.valid && this.stepFourForm.valid;
    if (allValid) {
      const value = {
        ...this.stepOneForm.value,
        ...this.stepTwoForm.value,
        ...this.stepThreeForm.value,
        ...this.stepFourForm.value
      };
      console.log('Online interview submit:', value);
    } else {
      this.stepOneForm.markAllAsTouched();
      this.stepTwoForm.markAllAsTouched();
      this.stepThreeForm.markAllAsTouched();
      this.stepFourForm.markAllAsTouched();
    }
  }
}
