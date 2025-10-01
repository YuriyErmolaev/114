import {Component, OnInit} from '@angular/core';
import {EntitySelectService} from "../../../../services/entity-select.service";
import {HttpClient} from "@angular/common/http";
import {DynamicFormComponent} from "../../../../../dynamic-forms/components/dynamic-form/dynamic-form.component";
import {NgIf} from "@angular/common";
 import { environment } from '@env/environment';


@Component({
  selector: 'app-generator-settings',
  standalone: true,
  imports: [
    DynamicFormComponent,
    NgIf
  ],
  templateUrl: './generator-settings.component.html',
  styleUrl: './generator-settings.component.css'
})
export class GeneratorSettingsComponent implements OnInit {
  entityName = 'generators';
  json_schema: any;
  backendUrl = `${environment.backBaseUrl}${environment.apiPath}`;
  endpoint = `${environment.backBaseUrl}${environment.apiPath}/generators`;
  endpointAddition = '';
  requestType = 'POST';
  item: any = null;
  json_settings: any;
  // selects = null;

  constructor(
    private entitySelectService: EntitySelectService,
    private http: HttpClient
  ) {}

  hasValidSettings(settings: any): boolean {
    if (!settings || typeof settings !== 'object') {
      return false;
    }
    return Object.values(settings).some(value => value !== null && value !== undefined && value !== '');
  }

  ngOnInit(): void {
    this.entitySelectService.entityItemSelected$.subscribe(data => {
      if (data.entityName === this.entityName) {
        //comment console.log('data.item from generator settings: ', data.item);
        const generatorId = data.item.uuid;

        this.item = data.item;

        //comment console.log('this.item from generator settings: ', this.item);

        this.json_schema = data.item.json_schema;



        // this.json_settings = data.item.json_settings;
        this.json_settings = this.hasValidSettings(data.item.json_settings) ? data.item.json_settings : null;
        //comment console.log('this.json_settings from generator settings: ', this.json_settings);

        this.endpointAddition = `${data.item.uuid}/settings`
        //comment console.log('this.json_schema: ', this.json_schema);
      }
    });
  }


  protected readonly Object = Object;
}
