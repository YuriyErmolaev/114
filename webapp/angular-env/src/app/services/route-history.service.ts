import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class RouteHistoryService {
  private history: string[] = [];

  constructor(private router: Router) {
    this.router.events.subscribe(evt => {
      if (evt instanceof NavigationEnd) {
        this.history.push(evt.urlAfterRedirects);
      }
    });
  }

  getHistory(): string[] {
    return [...this.history];
  }

  back(): void {
    this.history.pop(); // current
    const prev = this.history.pop(); // previous
    this.router.navigateByUrl(prev || '/');
  }
}
