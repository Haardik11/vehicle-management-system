import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Booking } from '../models/entities';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private BASE_URL = 'http://127.0.0.1:8000/api/bookings/';

  constructor(private http: HttpClient) {}

  getBookings(params: any = {}): Observable<Booking[]> {
    return this.http.get<Booking[]>(this.BASE_URL, { params });
  }

  updateBooking(id: string, booking: Partial<Booking>): Observable<Booking> {
    return this.http.put<Booking>(`${this.BASE_URL}${id}/`, booking);
  }

  assignVehicle(bookingId: string, vehicleId: string): Observable<Booking> {
    return this.http.patch<Booking>(`${this.BASE_URL}${bookingId}/`, { vehicleId });
  }
}