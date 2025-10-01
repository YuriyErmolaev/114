import {Component, OnInit} from '@angular/core';

import { CommonModule } from '@angular/common';
import {HttpService} from "../../services/http.service";
import {environment} from "@env/environment";

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  response: string | null = null;
  constructor(private http: HttpService) {}

  ngOnInit(): void {
  }

  checkSecure(): void {
    this.http.get<{ message: string; user: string }>(`${environment.apiUrl}/secure`)
      .subscribe({
        next: res => {
          this.response = `${res.message} (${res.user})`;
        },
        error: err => {
          this.response = `Error: ${err.status} ${err.statusText}`;
        }
      });
  }

  checkSecureInvalid(): void {
    this.http.failGet<{ message: string; user: string }>(
      `${environment.apiUrl}/secure`,
      'invalid.token.value'
    ).subscribe({
      next: res => {
        this.response = `${res.message} (${res.user})`;
      },
      error: err => {
        this.response = `Error: ${err.status} ${err.statusText}`;
      }
    });
  }



}

