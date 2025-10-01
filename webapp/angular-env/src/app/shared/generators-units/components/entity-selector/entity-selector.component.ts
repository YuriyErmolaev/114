import {Component, EventEmitter, Inject, Input, Output, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser, NgForOf, NgIf} from "@angular/common";
import {MatDialog} from "@angular/material/dialog";
import {GenericDialogComponent} from "../generic-dialog/generic-dialog.component";
import {RestService} from "../../../back-exchanger/services/rest.service";
import {EntitySelectService} from "../../services/entity-select.service";
import {FormsModule} from "@angular/forms";
// import {AppState} from "../../../../generators-units/template_uuid/state/app.reducer";
import {Store} from "@ngrx/store";
import { Unit } from '../../entities/units/models/unit.model';
import {ActivatedRoute} from "@angular/router";
 import { environment } from '@env/environment';
// import {AppState} from "../../../../template-uuid/state/app.reducer";



@Component({
  selector: 'app-entity-selector',
  standalone: true,
  imports: [
    NgForOf,
    FormsModule,
    NgIf
  ],
  templateUrl: './entity-selector.component.html',
  styleUrl: './entity-selector.component.css'
})
export class EntitySelectorComponent {
  @Input() addFormSchema: any;
  @Input() updateFormSchema: any;
  @Input() deleteFormSchema: any;
  @Input() entityName: string = '';
  @Input() entityNameId: string = '';
  @Input() selects?: { fieldName: string, values: any[] }[];

  public items: any[] = [];

  selectedItem: any = null;

  public baseUrl: string = `/`;
  public eps: any;
  selectedUUID: string | null = null;
  isAdmin = false;
  constructor(
      private dialog: MatDialog,
      private restService: RestService,
      private entitySelectService: EntitySelectService,
      @Inject(PLATFORM_ID) private platformId: Object,
      // private store: Store<AppState>,
      private route: ActivatedRoute
  ) {


  }

  getFirstItemUUID(): string | null {
    // return this.items && this.items.length > 0 ? this.items[0].uuid : null;
    return this.items && this.items.length > 0
        ? this.items.find(item => !item.disabled)?.uuid || null
        : null;
  }

  selectItem(selectedUUID: string | null = null) {
    if (this.items && this.items.length > 0) {
      const uuid = selectedUUID ? selectedUUID : this.getFirstItemUUID();
      this.selectedItem = this.items.find(item => item.uuid === uuid);

      if (this.selectedItem) {
        //cl_//comment console.log('Selected item:', this.selectedItem);
        this.entitySelectService.emitEntityItemSelected({
          item: this.selectedItem,
          entityName: this.entityNameId
        });
      } else {
        console.warn('Item with the specified UUID not found.');
      }
    } else {
      console.warn('Items array is empty or undefined.');
    }
  }

  ngOnInit() {
    this.route.data.subscribe(data => {
      this.isAdmin = data['isAdmin'];
    });
    this.eps = this.restService.generateEndpoints(this.baseUrl, this.entityNameId);
    this.restService.itemsData.asObservable().subscribe(({ entityName, items }) => {

      //comment console.log('entityName from init es:', entityName);
      //comment console.log('items from init es:', items);
      //comment console.log('this.entityName from init es:', this.entityNameId);

      if (entityName === this.entityNameId) {
        this.items = items;
        let changeSelect = !this.selectedUUID ||


            !this.items.find(item => item.uuid === this.selectedUUID && !item.disabled);


        if (this.items && this.items.length > 0 && changeSelect) {
          this.selectedUUID = this.getFirstItemUUID()
          this.selectItem ( this.selectedUUID );
        } else {
          console.warn('No items available for selection');
        }
      }


    });

    this.entitySelectService.entityItemSelected$.subscribe((data) => {

      console.log('data from entitySelectService.entityItemSelected$.subscribe((data ', data);
      if (data.entityName === 'units') {

        const selectedModel = data.item;
        if (this.entityNameId === 'generators') {

          console.log('this.entityNameId from if (this.entityNameId === generators) {')

          console.log('this.items generators from entity selector: ', this.items);

          // this.items = this.items.map(item => {
          //   console.log('item from this.items.map(item: ', item);
          //   item.disabled = !selectedModel.generators.includes(item.uuid);
          //   return item;
          // });

          this.items = this.items.map(item => ({
            ...item,
            disabled: !selectedModel.generators.includes(item.uuid)
          }));



          const firstVisibleItemUUID = this.getFirstItemUUID();
          this.selectedUUID = firstVisibleItemUUID;
          this.selectItem(firstVisibleItemUUID);


        }


      }
      if (data.entityName === 'generators') {

      }
    });

  }

  ngOnChanges() {
  }

  onSelectEntityItem(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.selectItem(selectElement.value);
  }

  private customOverlayAfterOpen(dialogRef: any) {
    if (isPlatformBrowser(this.platformId) || typeof document !== 'undefined') {
      dialogRef.afterOpened().subscribe(() => {
        const container = document.querySelector('.cdk-overlay-container') as HTMLElement;
        if (container) {
          container.style.position = 'fixed';
          container.style.top = '0';
          container.style.left = '0';
          container.style.zIndex = '1000';
          container.style.width = '100%';
          container.style.height = '100%';
        }

        const overlay = document.querySelector('.cdk-global-overlay-wrapper') as HTMLElement;
        if (overlay) {
          overlay.style.display = 'flex';
          overlay.style.height = '100%';
        }
      });
    }
  }

  private customOverlayAfterClose(dialogRef: any) {
    dialogRef.afterClosed().subscribe(() => {
      if (isPlatformBrowser(this.platformId) || typeof document !== 'undefined') {
        const container = document.querySelector('.cdk-overlay-container') as HTMLElement;
        if (container) {
          container.style.position = '';
          container.style.top = '';
          container.style.left = '';
          container.style.zIndex = '';
          container.style.width = '';
          container.style.height = '';
        }
        //cl_//comment console.log('The dialog was closed');
      }
    });
  }

  findId(obj: any): string | null {
    for (const key in obj) {
      if (key === 'id') {
        return obj[key];
      }
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        const found = this.findId(obj[key]);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  openAddForm() {

    //cl_//comment console.log('this.selects entity selector: ', this.selects);
    // this.entitySelectService.emitEntityItemSelected({ entityName: 'generators', item: null });

    const dialogRef = this.dialog.open(GenericDialogComponent, {

      width: '600px',
      maxWidth: '100%',
      data: {
        title: 'Добавление объекта',
        schema: this.addFormSchema,
        endpoint: this.eps.add.url,
        requestType: this.eps.add.method,
        selects: this.selects && this.selects.length ? this.selects : undefined
      }
    });
    this.customOverlayAfterOpen(dialogRef);
    this.customOverlayAfterClose(dialogRef);


    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.restService.getEntityItems(this.baseUrl, this.entityNameId);

        this.restService.itemsData.asObservable().subscribe(({ entityName, items }) => {
          if (entityName === this.entityNameId) {
            this.items = items;
            const uuid = this.findId(result);

            if (uuid) {
              //cl_//comment console.log('Found uuid:', uuid);
              this.selectedUUID = uuid;
              this.selectItem(this.selectedUUID);
            } else {
              //cl_//comment console.log('uuid not found in the result.');
            }

            //cl_//comment console.log('result from entity selector after add: ', result);
          }
        });

      } else {
        //cl_//comment console.log('Dialog closed without result');
      }
    });
  }

  openUpdateForm() {
    const dialogRef = this.dialog.open(GenericDialogComponent, {
      data: {
        title: 'Обновление объекта',
        schema: this.updateFormSchema,
        endpoint: this.eps.update.url,
        requestType: this.eps.update.method,
        item: this.selectedItem
      }
    });
    this.customOverlayAfterOpen(dialogRef);
    this.customOverlayAfterClose(dialogRef);

    dialogRef.afterClosed().subscribe(() => {
      this.restService.getEntityItems(this.baseUrl, this.entityNameId);
    });

  }

  openDeleteForm() {

    //cl_//comment console.log('this.selectedItem from entity selector component from open delete form: ', this.selectedItem);

    const dialogRef = this.dialog.open(GenericDialogComponent, {
      data: {
        title: 'Удаление объекта',
        schema: this.deleteFormSchema,
        endpoint: this.eps.delete.url,
        requestType: this.eps.delete.method,
        item: this.selectedItem
      }
    });

    this.customOverlayAfterOpen(dialogRef);
    this.customOverlayAfterClose(dialogRef);

    dialogRef.afterClosed().subscribe(() => {
      this.restService.getEntityItems(this.baseUrl, this.entityNameId);
    });

  }

  protected readonly HTMLInputElement = HTMLInputElement;
}
