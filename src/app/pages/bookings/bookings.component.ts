import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { Booking, Vehicle } from '../../models/entities';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-bookings',
  templateUrl: './bookings.component.html',
  styleUrls: ['./bookings.component.css'], // ✅ fixed typo
  imports: [CommonModule] // ✅ needed for *ngIf, *ngFor, and date pipe
})
export class BookingsComponent implements OnInit {
  bookings: (Booking & { vehicle?: Vehicle })[] = [];
  loading = false;
  error: string | null = null;

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit() {
    this.fetchBookings();
  }

  fetchBookings() {
    this.loading = true;
    const userId = this.getUserIdFromToken();
    if (!userId) {
      this.error = 'User not authenticated.';
      this.loading = false;
      return;
    }
    this.http.get<Booking[]>(`http://127.0.0.1:8000/api/bookings/?userId=${userId}`).subscribe({
      next: (bookings) => {
        this.bookings = bookings;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load bookings.';
        this.loading = false;
      }
    });
  }

  getUserIdFromToken(): string | null {
    const token = this.authService.getToken();
    if (!token) return null;
    try {
      const decoded: any = (window as any).jwt_decode
        ? (window as any).jwt_decode(token)
        : JSON.parse(atob(token.split('.')[1]));
      return decoded?.user_id || decoded?.id || null;
    } catch {
      return null;
    }
  }
}
