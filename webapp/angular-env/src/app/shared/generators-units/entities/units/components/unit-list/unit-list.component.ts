import {Component, OnInit} from '@angular/core';
import {RestService} from "../../../../../back-exchanger/services/rest.service";
import {Unit} from "../../models/unit.model";
import {EntitySelectorComponent} from "../../../../components/entity-selector/entity-selector.component";
import { addSchema } from '../../json-schemas/add-unit.schema';
import { updateSchema } from '../../json-schemas/update-unit.schema';
import { deleteSchema } from '../../json-schemas/delete-unit.schema';
import {TranslateModule} from "@ngx-translate/core";
 import { environment } from '@env/environment';


@Component({
  selector: 'app-unit-list',
  standalone: true,
  imports: [
    EntitySelectorComponent,
    TranslateModule
  ],
  templateUrl: './unit-list.component.html',
  styleUrl: './unit-list.component.css'
})
export class UnitListComponent implements OnInit {
  addSchema = addSchema;
  updateSchema = updateSchema;
  deleteSchema = deleteSchema;
  entityName = 'units';

  public baseUrl = `/`;

  constructor(private restService: RestService) {}

  ngOnInit() {
    //cl_//comment console.log('ngOnInit unit list');
    // this.restService.getEntityItems(this.baseUrl, this.entityName);
  }
}
