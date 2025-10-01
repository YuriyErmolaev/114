import {Component, OnInit} from '@angular/core';
import {EntitySelectService} from "../../../../services/entity-select.service";
import {MarkdownComponent} from "ngx-markdown";
 import { environment } from '@env/environment';


@Component({
  selector: 'app-unit-description',
  standalone: true,
  imports: [
    MarkdownComponent
  ],
  templateUrl: './unit-description.component.html',
  styleUrl: './unit-description.component.css'
})
export class UnitDescriptionComponent implements OnInit {

  entityName = 'units';
  description: string = '';
  backendUrl = `${environment.backBaseUrl}${environment.apiPath}`;


  constructor(private entitySelectService: EntitySelectService) {}

  ngOnInit(): void {
      this.entitySelectService.entityItemSelected$.subscribe(data => {
      if (data.entityName === this.entityName) {
        // //comment console.log('input data to unit descr: ', data);
        const unitUuid = data.item.uuid;
        this.description = data.item.description_md
          .replace(/{{\s*backendUrl\s*}}/g, this.backendUrl)
          .replace(/{{\s*unitUuid\s*}}/g, unitUuid);
      }
    });
  }






}
