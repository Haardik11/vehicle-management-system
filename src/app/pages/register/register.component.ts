import { Component } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [FormsModule, CommonModule]
})
export class RegisterComponent {
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  error: string | null = null;
  success: string | null = null;
  loading = false;

  constructor(private http: HttpClient, private router: Router) {}

  register() {
    // Clear previous messages
    this.error = null;
    this.success = null;

    // Validation
    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    if (!this.username || !this.email || !this.password) {
      this.error = 'All fields are required';
      return;
    }

    // Email format validation
    if (!this.validateEmail(this.email)) {
      this.error = 'Please enter a valid email address';
      return;
    }

    // Password strength validation (optional)
    if (this.password.length < 8) {
      this.error = 'Password must be at least 8 characters long';
      return;
    }

    this.loading = true;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    const body = {
      username: this.username,
      email: this.email,
      password: this.password,
      role: 'user'
    };

    console.log('Attempting registration with:', body); // Debug log

    this.http.post('http://127.0.0.1:8000/api/register/', body, { headers, withCredentials: true })
      .subscribe({
        next: (response: any) => {
          console.log('Registration successful:', response); // Debug log
          this.loading = false;
          this.success = 'Registration successful! Redirecting to login...';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (err: HttpErrorResponse) => {
          console.error('Registration error:', err); // Debug log
          this.loading = false;
          this.handleError(err);
        }
      });
  }

  private validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  private handleError(err: HttpErrorResponse) {
    let errorMessage = 'Registration failed. Please try again.';
    
    if (err.status === 0) {
      errorMessage = 'Unable to connect to server. Please check your connection and CORS settings.';
    } else if (err.error) {
      // Handle Django REST framework error format
      if (err.error.detail) {
        errorMessage = err.error.detail;
      } 
      // Handle Django form errors
      else if (err.error.username) {
        errorMessage = `Username: ${err.error.username.join(' ')}`;
      }
      else if (err.error.email) {
        errorMessage = `Email: ${err.error.email.join(' ')}`;
      }
      else if (err.error.password) {
        errorMessage = `Password: ${err.error.password.join(' ')}`;
      }
      // Handle string errors
      else if (typeof err.error === 'string') {
        try {
          const parsedError = JSON.parse(err.error);
          errorMessage = parsedError.message || parsedError.error || errorMessage;
        } catch (e) {
          errorMessage = err.error;
        }
      }
      // Handle other error formats
      else if (typeof err.error === 'object') {
        errorMessage = Object.entries(err.error)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(' ') : value}`)
          .join('; ');
      }
    }

    this.error = errorMessage;
    console.error('Full error details:', { 
      status: err.status, 
      statusText: err.statusText,
      url: err.url,
      error: err.error 
    });
  }
}