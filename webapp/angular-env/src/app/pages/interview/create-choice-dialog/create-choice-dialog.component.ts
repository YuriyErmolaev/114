import { Component } from '@angular/core';
import { MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-interview-create-choice-dialog',
  standalone: true,
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton],
  templateUrl: './create-choice-dialog.component.html',
  styleUrls: ['./create-choice-dialog.component.css']
})
export class InterviewCreateChoiceDialogComponent {
  constructor(private dialogRef: MatDialogRef<InterviewCreateChoiceDialogComponent>) {}

  chooseOnline(): void {
    this.dialogRef.close('online');
  }

  chooseOffline(): void {
    this.dialogRef.close('offline');
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
