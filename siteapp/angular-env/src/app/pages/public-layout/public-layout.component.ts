import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { PublicHeaderComponent } from '../../components/public-header/public-header.component';
import { PublicFooterComponent } from '../../components/public-footer/public-footer.component';

@Component({
  standalone: true,
  selector: 'app-public-layout',
  imports: [CommonModule, RouterOutlet, PublicHeaderComponent, PublicFooterComponent],
  templateUrl: './public-layout.component.html',
  styleUrls: ['./public-layout.component.css']
})
export class PublicLayoutComponent {}
