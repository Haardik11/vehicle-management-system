import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'http://127.0.0.1:8000/api';
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/token/`, { username, password });
  }

  saveToken(token: string) {
    if (!this.isBrowser) return;
    localStorage.setItem('auth_token', token);

    // Decode token to get role
    const payload = JSON.parse(atob(token.split('.')[1]));
    const role = payload.role;
    localStorage.setItem('user_role', role);
  }

  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem('auth_token') : null;
  }

  getUserRole(): string | null {
    return this.isBrowser ? localStorage.getItem('user_role') : null;
  }

  logout() {
    if (!this.isBrowser) return;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
  }
}
