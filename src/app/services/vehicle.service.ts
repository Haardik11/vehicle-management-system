import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Vehicle } from '../models/entities';

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private BASE_URL = 'http://127.0.0.1:8000/api/vehicles/';

  constructor(private http: HttpClient) {}

  getVehicles(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(this.BASE_URL);
  }

  addVehicle(vehicle: Partial<Vehicle>): Observable<Vehicle> {
    return this.http.post<Vehicle>(this.BASE_URL, vehicle);
  }

  updateVehicle(id: string, vehicle: Partial<Vehicle>): Observable<Vehicle> {
    return this.http.put<Vehicle>(`${this.BASE_URL}${id}/`, vehicle);
  }

  deleteVehicle(id: string): Observable<any> {
    return this.http.delete(`${this.BASE_URL}${id}/`);
  }
}