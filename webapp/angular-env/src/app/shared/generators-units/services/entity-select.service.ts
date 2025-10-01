import { Injectable } from '@angular/core';
import {Subject} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class EntitySelectService {
  private entitySelectedSource = new Subject<{ entityName: string, item: any }>();
  constructor() { }
  entityItemSelected$ = this.entitySelectedSource.asObservable();
  emitEntityItemSelected(data: { entityName: string, item: any }) {
    //comment console.log('select entity name: ', data.entityName);
    //comment console.log('select entity item: ', data.item);
    this.entitySelectedSource.next(data);
  }
}
