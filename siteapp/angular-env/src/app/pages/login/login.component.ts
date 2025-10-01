import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '@env/environment';
import { AuthService } from '../../services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';
  error = '';

  constructor(private http: HttpClient, private auth: AuthService, private router: Router) {}


  login(): void {
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: 'fastapi-client',
      username: this.username,
      password: this.password
    });

    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });

    const base_realms = environment.kcUrl.replace(/\/+$/, '');
    const url = `${base_realms}/demo/protocol/openid-connect/token`;

    this.http.post<any>(url, body.toString(), { headers })
      .subscribe({
        next: (res) => {
          this.auth.login(res.access_token);
          this.router.navigateByUrl('/home');
        },
        error: () => {
          this.error = 'Invalid credentials';
        }
      });
  }
}
