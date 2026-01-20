import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/token/`, { username, password });
  }

  saveToken(token: string) {
    localStorage.setItem('auth_token', token);

    // Decode token to get role
    const payload = JSON.parse(atob(token.split('.')[1]));
    const role = payload.role;
    localStorage.setItem('user_role', role);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getUserRole(): string | null {
    return localStorage.getItem('user_role');
  }

  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
  }
}
