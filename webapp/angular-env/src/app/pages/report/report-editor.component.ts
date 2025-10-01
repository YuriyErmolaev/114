import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';

interface ReportData {
  uuid?: string | null;
  subject: string;
  interviewer: string;
  date: string; // ISO date string
  score?: number | null;
  status: 'draft' | 'in_review' | 'approved' | 'rejected' | '';
  summary?: string;
  tags?: string; // comma separated
}

@Component({
  standalone: true,
  selector: 'app-report-editor',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './report-editor.component.html',
  styleUrls: ['./report-editor.component.css']
})
export class ReportEditorComponent implements OnInit {
  public uuid: string | null = null;

  stepOneForm: FormGroup;
  stepTwoForm: FormGroup;

  private loadedSnapshot: ReportData | null = null;

  public readonly statusOptions: Array<ReportData['status']> = [
    'draft', 'in_review', 'approved', 'rejected'
  ];

  constructor(private readonly route: ActivatedRoute, private readonly fb: FormBuilder) {
    this.stepOneForm = this.fb.group({
      subject: ['', [Validators.required]],
      interviewer: ['', [Validators.required]],
      date: [null, [Validators.required]]
    });

    this.stepTwoForm = this.fb.group({
      score: [null, [Validators.min(0), Validators.max(100)]],
      status: ['', [Validators.required]],
      summary: [''],
      tags: ['']
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(async params => {
      this.uuid = params.get('uuid');
      await this.prefillFromUuid(this.uuid);
    });
  }

  get canSave(): boolean {
    return this.stepOneForm.valid && this.stepTwoForm.valid && this.hasChanges();
  }

  async resetToLoaded(): Promise<void> {
    if (!this.loadedSnapshot) {
      // reset to empty
      this.stepOneForm.reset({ subject: '', interviewer: '', date: null });
      this.stepTwoForm.reset({ score: null, status: '', summary: '', tags: '' });
    } else {
      const d = this.loadedSnapshot;
      this.stepOneForm.reset({
        subject: d.subject ?? '',
        interviewer: d.interviewer ?? '',
        date: d.date ? new Date(d.date) : null
      });
      this.stepTwoForm.reset({
        score: d.score ?? null,
        status: d.status ?? '',
        summary: d.summary ?? '',
        tags: d.tags ?? ''
      });
    }
    this.stepOneForm.markAsPristine();
    this.stepOneForm.markAsUntouched();
    this.stepTwoForm.markAsPristine();
    this.stepTwoForm.markAsUntouched();
  }

  async save(): Promise<void> {
    if (!(this.stepOneForm.valid && this.stepTwoForm.valid)) {
      this.stepOneForm.markAllAsTouched();
      this.stepTwoForm.markAllAsTouched();
      return;
    }
    const payload = this.buildNormalized();
    // Simulate save by logging and updating snapshot
    console.log('Report save:', payload);
    this.loadedSnapshot = { ...payload };
    this.stepOneForm.markAsPristine();
    this.stepTwoForm.markAsPristine();
  }

  private async prefillFromUuid(uuid: string | null): Promise<void> {
    if (!uuid) {
      // Nothing to load; snapshot empty form
      this.loadedSnapshot = this.buildNormalized();
      return;
    }
    const loaded = await this.loadByUuid(uuid);
    if (loaded) {
      this.stepOneForm.patchValue({
        subject: loaded.subject || '',
        interviewer: loaded.interviewer || '',
        date: loaded.date ? new Date(loaded.date) : null
      });
      this.stepTwoForm.patchValue({
        score: loaded.score ?? null,
        status: loaded.status || '',
        summary: loaded.summary || '',
        tags: loaded.tags || ''
      });
      this.loadedSnapshot = this.normalize(loaded);
      this.stepOneForm.markAsPristine();
      this.stepTwoForm.markAsPristine();
    } else {
      // Not found: keep empty but snapshot empty
      this.loadedSnapshot = this.buildNormalized();
    }
  }

  private hasChanges(): boolean {
    if (!this.loadedSnapshot) return true;
    const current = this.buildNormalized();
    return JSON.stringify(current) !== JSON.stringify(this.loadedSnapshot);
  }

  private buildNormalized(): ReportData {
    const v1 = this.stepOneForm.value as any;
    const v2 = this.stepTwoForm.value as any;
    const date: Date | null = v1.date instanceof Date ? v1.date : (v1.date ? new Date(v1.date) : null);
    const scoreRaw = v2.score;
    const score = scoreRaw === null || scoreRaw === undefined || scoreRaw === '' ? null : Number(scoreRaw);
    const normalized: ReportData = {
      uuid: this.uuid,
      subject: (v1.subject || '').toString().trim(),
      interviewer: (v1.interviewer || '').toString().trim(),
      date: date ? date.toISOString() : '',
      score: score,
      status: (v2.status || '').toString().trim() as ReportData['status'],
      summary: (v2.summary || '').toString().trim(),
      tags: (v2.tags || '').toString().trim()
    };
    return normalized;
  }

  private normalize(d: Partial<ReportData>): ReportData {
    const date = d.date ? new Date(d.date).toISOString() : '';
    return {
      uuid: d.uuid ?? this.uuid ?? null,
      subject: (d.subject ?? '').toString(),
      interviewer: (d.interviewer ?? '').toString(),
      date,
      score: d.score === undefined ? null : d.score,
      status: (d.status ?? '') as ReportData['status'],
      summary: d.summary ?? '',
      tags: d.tags ?? ''
    };
  }

  private async loadByUuid(uuid: string): Promise<ReportData | null> {
    // Local async mock loader; in real app this would call a service.
    const MOCKS: Record<string, ReportData> = {
      '11111111-1111-1111-1111-111111111111': {
        uuid,
        subject: 'Initial Subject',
        interviewer: 'Alice',
        date: new Date('2024-01-15').toISOString(),
        score: 85,
        status: 'in_review',
        summary: 'Initial summary',
        tags: 'alpha,beta'
      },
      '22222222-2222-2222-2222-222222222222': {
        uuid,
        subject: 'Security Audit',
        interviewer: 'Bob',
        date: new Date('2024-02-20').toISOString(),
        score: null,
        status: 'draft',
        summary: '',
        tags: ''
      }
    };
    return new Promise(resolve => setTimeout(() => resolve(MOCKS[uuid] ?? null), 300));
  }
}
