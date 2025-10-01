import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'dark' | 'light';

const THEME_KEY = 'theme';
const CLASS_DARK = 'theme-dark';
const CLASS_LIGHT = 'theme-light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private theme: ThemeMode = 'dark';

  // Centralized list of available themes
  private readonly themes: ThemeMode[] = ['dark', 'light'];

  // Human-readable labels for themes
  private readonly labels: Record<ThemeMode, string> = {
    dark: 'Dark',
    light: 'Light',
  };

  // Observable for theme changes
  public readonly theme$ = new BehaviorSubject<ThemeMode>(this.theme);

  constructor() {}

  init(): void {
    // Read persisted value; default to dark
    const saved = (typeof localStorage !== 'undefined') ? localStorage.getItem(THEME_KEY) as ThemeMode | null : null;
    const mode: ThemeMode = saved === 'light' || saved === 'dark' ? saved : 'dark';
    this.setTheme(mode);
  }

  getAvailableThemes(): ThemeMode[] {
    return [...this.themes];
  }

  getThemeLabel(mode: ThemeMode): string {
    return this.labels[mode] ?? mode;
  }

  getTheme(): ThemeMode {
    return this.theme;
  }

  setTheme(mode: ThemeMode): void {
    if (this.theme === mode) {
      // Still ensure classes are applied (in case DOM reset) and emit current value
      this.applyClass();
      this.theme$.next(this.theme);
      return;
    }
    this.theme = mode;
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {}
    this.applyClass();
    this.theme$.next(this.theme);
  }

  toggleTheme(): void {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
  }

  private applyClass(): void {
    const root = document.documentElement;
    if (!root) return;
    // Ensure explicit class is present
    root.classList.remove(CLASS_DARK, CLASS_LIGHT);
    if (this.theme === 'dark') {
      root.classList.add(CLASS_DARK);
    } else {
      root.classList.add(CLASS_LIGHT);
    }
  }
}
