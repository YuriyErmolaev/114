import {Component, OnInit} from '@angular/core';
import {NgForOf} from "@angular/common";
import {EntitySelectorComponent} from "../../../../components/entity-selector/entity-selector.component";
import { addSchema } from '../../json-schemas/add-generator.schema';
import { updateSchema } from '../../json-schemas/update-generator.schema';
import { deleteSchema } from '../../json-schemas/delete-generator.schema';
import { Generator } from '../../models/generator.model';
import {RestService} from "../../../../../back-exchanger/services/rest.service";
import {TranslateModule} from "@ngx-translate/core";
import {Store} from "@ngrx/store";
import {filter} from "rxjs";
 import { environment } from '@env/environment';
import {AppState} from "../../../../../../template-uuid/state/app.reducer";
// import {AppState} from "../../../../../../generators-units/template_uuid/state/app.reducer";


@Component({
  selector: 'app-generator-list',
  standalone: true,
  imports: [
    NgForOf,
    EntitySelectorComponent,
    TranslateModule
  ],
  templateUrl: './generator-list.component.html',
  styleUrl: './generator-list.component.css'
})
export class GeneratorListComponent implements OnInit {
  addSchema = addSchema;
  updateSchema = updateSchema;
  deleteSchema = deleteSchema;
  generators: Generator[] = [];
  selects: { fieldName: string, values: any[] }[] = [];
  entityName = 'generators';
  public baseUrl = `/`;

  constructor(
      private restService: RestService,
      private store: Store<AppState>
  ) {}

  ngOnInit() {
    this.store.select((state: any) => state.app.entities)
        .subscribe(entities => {
          console.log('entities: ', entities);
          if (entities && entities[this.entityName] && entities[this.entityName]?.items)
            this.generators = entities[this.entityName].items;
          if (entities && entities[this.entityName] && entities['units']?.items) {
            const unitOptions = entities['units'].items.map((unit: any) => ({ label: unit.name, value: unit.uuid }));
            this.selects = [{ fieldName: 'unit_id', values: unitOptions }];
          }
          if (entities && entities[this.entityName] && entities['elements']?.items) {
            const elementOptions = entities['elements'].items.map((element: any) => ({ label: element.name, value: element.uuid }));
            const selectOption = { fieldName: 'element_id', values: elementOptions };
            this.selects.push(selectOption);
          }
        });
  }


}

