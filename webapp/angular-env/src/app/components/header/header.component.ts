import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService, ThemeMode } from '../../shared/services/theme.service';
import { Subject, takeUntil } from 'rxjs';
import { QuickStartModalComponent } from '../../shared/components/quick-start-modal/quick-start-modal.component';
import {FormsModule} from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, QuickStartModalComponent],
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  // Theme data
  themes: ThemeMode[] = [];
  labels: Record<ThemeMode, string> = {} as any;
  selectedTheme!: ThemeMode;

  // Dropdown & modal state
  isSystemOpen = false;
  isQuickStartOpen = false;

  @ViewChild('systemBtn', { read: ElementRef }) systemBtn?: ElementRef<HTMLElement>;
  @ViewChild('systemMenu', { read: ElementRef }) systemMenu?: ElementRef<HTMLElement>;

  private destroy$ = new Subject<void>();

  constructor(
    public auth: AuthService,
    private router: Router,
    private themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    // Initialize from service after DI
    this.themes = this.themeService.getAvailableThemes();
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

  toggleSystem(): void {
    this.isSystemOpen = !this.isSystemOpen;
    if (this.isSystemOpen) {
      // Defer focus to first menu item on next tick
      setTimeout(() => this.focusFirstMenuItem(), 0);
    }
  }

  private focusFirstMenuItem(): void {
    const menu = this.systemMenu?.nativeElement;
    if (!menu) return;
    const first = menu.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
  }

  openQuickStart(): void {
    this.isQuickStartOpen = true;
    this.closeSystem();
  }

  closeQuickStart(): void {
    this.isQuickStartOpen = false;
    this.systemBtn?.nativeElement.focus();
  }

  goSettings(): void {
    this.router.navigateByUrl('/settings');
    this.closeSystem();
  }

  closeSystem(): void {
    this.isSystemOpen = false;
  }

  logout(): void {
    console.log('[Header] Logout clicked'); // log click on Logout
    this.auth.logout();
    this.closeSystem();
    this.router.navigateByUrl('/'); // go to Land (root)
  }

  // Close dropdown or modal on ESC
  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.isQuickStartOpen) {
      this.closeQuickStart();
    } else if (this.isSystemOpen) {
      this.closeSystem();
      this.systemBtn?.nativeElement.focus();
    }
  }

  // Outside click
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;
    const withinBtn = this.systemBtn?.nativeElement.contains(target);
    const withinMenu = this.systemMenu?.nativeElement.contains(target);
    if (this.isSystemOpen && !withinBtn && !withinMenu) {
      this.closeSystem();
    }
  }

  // Keyboard navigation within the System menu
  onMenuKeydown(event: KeyboardEvent): void {
    const menu = this.systemMenu?.nativeElement;
    if (!menu) return;
    const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const currentIndex = items.findIndex(el => el === document.activeElement);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        (items[(currentIndex + 1 + items.length) % items.length] || items[0])?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        (items[(currentIndex - 1 + items.length) % items.length] || items[0])?.focus();
        break;
      case 'Home':
        event.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case 'Tab':
        // Close and allow tabbing out
        this.closeSystem();
        break;
      case 'Escape':
        this.closeSystem();
        this.systemBtn?.nativeElement.focus();
        break;
    }
  }
}
