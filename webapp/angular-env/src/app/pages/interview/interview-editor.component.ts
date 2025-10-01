import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  selector: 'app-interview-editor',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
  ],
  templateUrl: './interview-editor.component.html',
  styleUrls: ['./interview-editor.component.css']
})
export class InterviewEditorComponent implements OnInit {
  public uuid: string | null = null;

  stepOneForm: FormGroup;
  stepTwoForm: FormGroup;

  private loadedSnapshot: any | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly fb: FormBuilder,
  ) {
    this.stepOneForm = this.fb.group({
      title: ['', Validators.required],
      interviewer: ['', Validators.required],
      date: [null, Validators.required], // Date object
    });

    this.stepTwoForm = this.fb.group({
      notes: [''],
      tags: [''],
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(async params => {
      this.uuid = params.get('uuid');
      await this.loadByUuid(this.uuid);
    });
  }

  get canSave(): boolean {
    if (!this.loadedSnapshot) return false;
    const bothValid = this.stepOneForm.valid && this.stepTwoForm.valid;
    const hasChanges = this.hasChanges();
    return bothValid && hasChanges;
  }

  async loadByUuid(uuid: string | null): Promise<void> {
    const data = await this.simulateFetch(uuid);
    // Patch forms
    this.stepOneForm.reset({
      title: data.title ?? '',
      interviewer: data.interviewer ?? '',
      date: data.date ? new Date(data.date) : null,
    });
    this.stepTwoForm.reset({
      notes: data.notes ?? '',
      tags: data.tags ?? '',
    });
    // store snapshot normalized
    this.loadedSnapshot = this.buildCurrentModel();
  }

  resetToLoaded(): void {
    if (!this.loadedSnapshot) return;
    const s = this.loadedSnapshot;
    this.stepOneForm.reset({
      title: s.title ?? '',
      interviewer: s.interviewer ?? '',
      date: s.date ? new Date(s.date) : null,
    });
    this.stepTwoForm.reset({
      notes: s.notes ?? '',
      tags: s.tags ?? '',
    });
  }

  save(): void {
    if (!this.canSave) return;
    const payload = { uuid: this.uuid, ...this.stepOneForm.value, ...this.stepTwoForm.value };
    console.log(payload);
    // After save, update snapshot to current values
    this.loadedSnapshot = this.buildCurrentModel();
    // mark forms as pristine
    this.stepOneForm.markAsPristine();
    this.stepTwoForm.markAsPristine();
  }

  private hasChanges(): boolean {
    const current = this.buildCurrentModel();
    return JSON.stringify(current) !== JSON.stringify(this.loadedSnapshot);
  }

  private buildCurrentModel() {
    const one = this.stepOneForm.value;
    const two = this.stepTwoForm.value;
    return {
      title: one.title ?? '',
      interviewer: one.interviewer ?? '',
      // normalize date to ISO date string (yyyy-MM-dd) for comparison
      date: one.date ? new Date(one.date).toISOString() : null,
      notes: two.notes ?? '',
      tags: two.tags ?? '',
    };
  }

  private async simulateFetch(uuid: string | null): Promise<any> {
    // Simulate async delay
    await new Promise(res => setTimeout(res, 50));
    if (!uuid) {
      return { title: '', interviewer: '', date: null, notes: '', tags: '' };
    }
    // Provide some deterministic mock data based on uuid for demo
    const seed = uuid.slice(0, 4);
    return {
      title: `Interview ${seed}`,
      interviewer: `User ${seed}`,
      date: new Date().toISOString(),
      notes: '',
      tags: '',
    };
  }
}
