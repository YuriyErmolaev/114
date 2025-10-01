import { Component, OnDestroy, OnInit } from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService, ThemeMode } from '../../shared/services/theme.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  selector: 'app-public-header',
  templateUrl: './public-header.component.html',
  styleUrls: ['./public-header.component.css']
})
export class PublicHeaderComponent implements OnInit, OnDestroy {
  // Dropdown data (initialized after DI in ngOnInit)
  themes: ThemeMode[] = [];
  labels: Record<ThemeMode, string> = {} as any;

  // Currently selected theme (initialized in ngOnInit)
  selectedTheme!: ThemeMode;

  private destroy$ = new Subject<void>();

  constructor(
    public auth: AuthService,
    private router: Router,
    private themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    // Initialize from service after DI
    this.themes = this.themeService.getAvailableThemes();
    // Fill labels dynamically from service, covering any future themes
    this.labels = this.themes.reduce((acc, mode) => {
      acc[mode] = this.themeService.getThemeLabel(mode);
      return acc;
    }, {} as Record<ThemeMode, string>);
    this.selectedTheme = this.themeService.getTheme();

    // Keep local selectedTheme in sync with service
    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(mode => {
        this.selectedTheme = mode;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onChangeTheme(mode: ThemeMode | string): void {
    const next = (mode as ThemeMode);
    this.themeService.setTheme(next);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToDocs() {
    this.router.navigate(['/docs']);
  }

}
