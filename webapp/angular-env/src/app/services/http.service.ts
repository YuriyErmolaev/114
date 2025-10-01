import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class HttpService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  get<T>(url: string) {
    const token = this.auth.getToken();
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    return this.http.get<T>(url, { headers });
  }

  failGet<T>(url: string, token: string) {
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<T>(url, { headers });
  }


}
