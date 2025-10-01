import {Component, HostListener, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {RouterLink} from "@angular/router";
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent implements OnInit {
  collapsed = false;
  private readonly mobileBp = 768;

  ngOnInit(): void {
    this.applyResponsiveState();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.applyResponsiveState();
  }

  toggle(): void {
    this.collapsed = !this.collapsed;
  }

  private applyResponsiveState(): void {
    if (typeof window === 'undefined') return;
    const isMobile = window.innerWidth < this.mobileBp;
    if (isMobile) {
      this.collapsed = true;
    }
  }
}

