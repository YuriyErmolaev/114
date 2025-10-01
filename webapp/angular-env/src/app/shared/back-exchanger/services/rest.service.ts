import { Injectable } from '@angular/core';
import {BehaviorSubject, map, Observable, tap} from "rxjs";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {Store} from "@ngrx/store";

@Injectable({
  providedIn: 'root'
})
export class RestService {

  public itemsData = new BehaviorSubject<{ entityName: string, items: any[] }>({ entityName: '', items: [] });

  public serverVersion$ = new BehaviorSubject<string>('...');

  constructor(
      private http: HttpClient,
      private store: Store
  ) {}

  generateEndpoints(baseUrl: string, entityName: string) {
    return {
      add: { url: `${baseUrl}/${entityName}`, method: 'POST' },
      update: { url: `${baseUrl}/${entityName}`, method: 'PUT' },
      delete: { url: `${baseUrl}/${entityName}`, method: 'DELETE' }
    };
  }


  getEntityItems(baseUrl: string, entityName: string) {
    const fullUrl = `${baseUrl}/${entityName}`;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.get<any[]>(fullUrl, { headers }).pipe(
        tap((items) => {

          console.log('[restService] entity name of gotten items: ', entityName);
          console.log('[restService] gotten items: ', items);

          this.itemsData.next({ entityName, items });

          // this.store.dispatch(setData({ entityName, items }));

        })
    ).subscribe(); // Subscribe to execute the request
  }

  getServerVersion(baseUrl: string): void {
    this.http.get(`${baseUrl}/server_version`, { responseType: 'text' }).subscribe({
      next: (response) => this.serverVersion$.next(response),
      error: () => this.serverVersion$.next('Error fetching version'),
    });
  }

}
