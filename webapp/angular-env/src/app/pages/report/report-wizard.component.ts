import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { WizardLayoutComponent } from '../../shared/wizard/wizard-layout.component';
import { WizardSummaryComponent, WizardSummaryItem } from '../../shared/wizard/wizard-summary.component';
import { AutofillSyncDirective } from '../../shared/autofill-sync.directive';

@Component({
  standalone: true,
  selector: 'app-report-wizard',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatButtonModule,
    WizardLayoutComponent,
    WizardSummaryComponent,
    AutofillSyncDirective
  ],
  templateUrl: './report-wizard.component.html',
  styleUrls: ['./report-wizard.component.css']
})
export class ReportWizardComponent implements OnInit {
  stepOneForm: FormGroup;
  stepTwoForm: FormGroup;
  metricsForm: FormGroup;
  publishingForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.stepOneForm = this.fb.group({
      subject: ['', Validators.required],
      interviewer: ['', Validators.required],
      date: [null, Validators.required]
    });

    this.stepTwoForm = this.fb.group({
      score: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
      status: ['', Validators.required],
      comments: ['']
    });

    // Step 3: Metrics (example; optional fields)
    this.metricsForm = this.fb.group({
      summaryScore: [null],
      status: ['']
    });

    // Step 4: Publishing (example; optional fields)
    this.publishingForm = this.fb.group({
      reviewer: [''],
      publishedAt: [null]
    });
  }

  ngOnInit(): void {}

  get subjectCtrl() { return this.stepOneForm.get('subject'); }
  get interviewerCtrl() { return this.stepOneForm.get('interviewer'); }
  get dateCtrl() { return this.stepOneForm.get('date'); }
  get scoreCtrl() { return this.stepTwoForm.get('score'); }
  get statusCtrl() { return this.stepTwoForm.get('status'); }

  get summaryItems(): WizardSummaryItem[] {
    const s1 = this.stepOneForm.value as { subject?: string; interviewer?: string; date?: Date };
    const s2 = this.stepTwoForm.value as { score?: number; status?: string; comments?: string };
    const s3 = this.metricsForm.value as { summaryScore?: number; status?: string };
    const s4 = this.publishingForm.value as { reviewer?: string; publishedAt?: Date };
    const score = (s3.summaryScore ?? s2.score) as unknown;
    const status = (s3.status ?? s2.status) as unknown;
    return [
      { label: 'Subject', value: s1.subject },
      { label: 'Interviewer', value: s1.interviewer },
      { label: 'Date', value: s1.date },
      { separator: true },
      { label: 'Score', value: score },
      { label: 'Status', value: status },
      { label: 'Reviewer', value: s4.reviewer },
      { label: 'Published at', value: s4.publishedAt },
      { separator: true },
      { label: 'Comments', value: s2.comments, multiline: true }
    ];
  }

  onSubmit(): void {
    const valid = this.stepOneForm.valid && this.stepTwoForm.valid && this.metricsForm.valid && this.publishingForm.valid;
    if (valid) {
      const payload = {
        ...this.stepOneForm.value,
        ...this.stepTwoForm.value,
        ...this.metricsForm.value,
        ...this.publishingForm.value
      };
      console.log('Report wizard submit:', payload);
    } else {
      this.stepOneForm.markAllAsTouched();
      this.stepTwoForm.markAllAsTouched();
      this.metricsForm.markAllAsTouched();
      this.publishingForm.markAllAsTouched();
    }
  }
}
