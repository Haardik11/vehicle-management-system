import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://127.0.0.1:8000/api/'; // your Django API URL

  constructor(private http: HttpClient) {}

  get(endpoint: string): Observable<any> {
    return this.http.get(this.baseUrl + endpoint, {
      headers: this.getHeaders()
    });
  }

  post(endpoint: string, data: any): Observable<any> {
    return this.http.post(this.baseUrl + endpoint, data, {
      headers: this.getHeaders()
    });
  }

  put(endpoint: string, data: any): Observable<any> {
    return this.http.put(this.baseUrl + endpoint, data, {
      headers: this.getHeaders()
    });
  }

  delete(endpoint: string): Observable<any> {
    return this.http.delete(this.baseUrl + endpoint, {
      headers: this.getHeaders()
    });
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }
}
