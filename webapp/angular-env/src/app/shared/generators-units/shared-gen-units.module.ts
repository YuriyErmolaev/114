import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CsvTableComponent } from './components/csv-table/csv-table.component';
import { EntitySelectorComponent } from './components/entity-selector/entity-selector.component';
import { GenericDialogComponent } from './components/generic-dialog/generic-dialog.component';
import { EntitySelectService } from './services/entity-select.service';

@NgModule({
    declarations: [],
    imports: [
        CommonModule,
        CsvTableComponent,
        EntitySelectorComponent,
        GenericDialogComponent
    ],
    providers: [
        EntitySelectService
    ],
    exports: [
        CsvTableComponent,
        EntitySelectorComponent,
        GenericDialogComponent
    ]
})
export class SharedGenUnitsModule {}
