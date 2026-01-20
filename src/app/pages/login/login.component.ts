import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule // ← Added RouterModule to make routerLink work
  ]
})
export class LoginComponent {
  username = '';
  password = '';
  error: string | null = null;
  loading = false;

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    if (!this.username || !this.password) {
      this.error = 'Please enter both username and password';
      return;
    }

    this.loading = true;
    this.error = null;

    this.authService.login(this.username, this.password).subscribe({
      next: (res) => {
        const token = res.access || res.token || res.access_token;
        if (token) {
          this.authService.saveToken(token);
          const role = this.authService.getUserRole();

          if (role === 'admin') {
            this.router.navigate(['/admin-dashboard']);
          } else if (role === 'call_center') {
            this.router.navigate(['/callcenter-dashboard']);
          } else {
            this.router.navigate(['/user-dashboard']);
          }
        } else {
          this.error = 'Invalid response from server.';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Login failed. Please check your credentials.';
        this.loading = false;
      }
    });
  }
}