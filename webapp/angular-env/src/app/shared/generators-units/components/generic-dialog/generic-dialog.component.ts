import {Component, Inject} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose, MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import {DynamicFormComponent} from "../../../dynamic-forms/components/dynamic-form/dynamic-form.component";
import {MatButton} from "@angular/material/button";

@Component({
  selector: 'app-generic-dialog',
  standalone: true,
  imports: [
    DynamicFormComponent,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    MatDialogTitle,
    MatDialogContent
  ],
  templateUrl: './generic-dialog.component.html',
  styleUrl: './generic-dialog.component.css'
})
export class GenericDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<GenericDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
