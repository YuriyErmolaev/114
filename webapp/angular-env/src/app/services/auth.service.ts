import { Injectable } from '@angular/core';
import {WsService} from "./ws.service";

@Injectable({ providedIn: 'root' })
export class AuthService {
  // constructor(private ws: WsService) {}

  private tokenKey = 'access_token';

  login(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp && payload.exp > now;
    } catch {
      return false;
    }
  }

  tokenExpiresSoon(thresholdSeconds: number = 60): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp && payload.exp - now < thresholdSeconds;
    } catch {
      return true;
    }
  }

  getRefreshToken(): string | null {
    // for future use
    return null;
  }
}
