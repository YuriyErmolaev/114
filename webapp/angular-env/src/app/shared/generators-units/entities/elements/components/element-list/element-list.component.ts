import {Component, OnInit} from '@angular/core';
import { addSchema } from '../../json-schemas/add.schema';
import { RestService } from "../../../../../back-exchanger/services/rest.service";
import { EntitySelectorComponent } from "../../../../components/entity-selector/entity-selector.component";
import { updateSchema } from '../../json-schemas/update.schema';
import { deleteSchema } from '../../json-schemas/delete.schema';
import {TranslateModule} from "@ngx-translate/core";
 import { environment } from '@env/environment';



@Component({
  selector: 'app-element-list',
  standalone: true,
    imports: [EntitySelectorComponent, TranslateModule],
  templateUrl: './element-list.component.html',
  styleUrl: './element-list.component.css'
})
export class ElementListComponent implements OnInit {
  addSchema = addSchema;
  updateSchema = updateSchema;
  deleteSchema = deleteSchema;
  entityName = 'elements';

  public baseUrl = `${environment.backBaseUrl}${environment.apiPath}`;

  constructor(private restService: RestService) {}

  ngOnInit() {
    this.restService.getEntityItems(this.baseUrl, this.entityName);
  }
}
