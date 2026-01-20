import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css'],
  imports: [CommonModule, FormsModule],
})
export class UserDashboardComponent implements OnInit {
  bookings: any[] = [];
  availableVehicles: any[] = [];

  // Filters
  filterCapacity: number | null = null;
  filterDate: string = '';
  filterType: string = '';

  // Form and state
  showBookingForm = false;
  error: string | null = null;

  form = {
    vehicleId: '',
    pickup: '',
    drop: '',
    purpose: '',
    date: '',
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchBookings();
    this.fetchVehicles();
  }

  fetchBookings() {
    const token = localStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<any[]>('http://127.0.0.1:8000/api/bookings/', { headers }).subscribe({
      next: (data) => {
        this.bookings = data;
      },
      error: () => (this.error = 'Failed to fetch your bookings.'),
    });
  }

  fetchVehicles() {
    const token = localStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<any[]>('http://127.0.0.1:8000/api/vehicles/', { headers }).subscribe({
      next: (data) => {
        this.availableVehicles = data.filter((v) => v.status === 'Available');
      },
      error: () => (this.error = 'Failed to fetch vehicles.'),
    });
  }

  get filteredVehicles() {
    return this.availableVehicles.filter((v) => {
      const matchType = !this.filterType || v.type === this.filterType;
      const matchCapacity = !this.filterCapacity || v.capacity >= this.filterCapacity;
      const matchDate = !this.filterDate || new Date(v.available_from) <= new Date(this.filterDate);
      return matchType && matchCapacity && matchDate;
    });
  }

  openBookingForm(vehicleId: number) {
    this.showBookingForm = true;
    this.form.vehicleId = vehicleId.toString();
  }

  cancelBooking() {
    this.showBookingForm = false;
    this.form = { vehicleId: '', pickup: '', drop: '', purpose: '', date: '' };
  }

  submitBooking() {
    const token = localStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };

    const body = {
      vehicle: Number(this.form.vehicleId),
      pickup_location: this.form.pickup,
      drop_location: this.form.drop,
      purpose: this.form.purpose,
      date: this.form.date,
      status: 'Pending',
    };

    this.http.post('http://127.0.0.1:8000/api/bookings/', body, { headers }).subscribe({
      next: () => {
        this.fetchBookings();
        this.cancelBooking();
      },
      error: () => (this.error = 'Booking failed. Try again.'),
    });
  }

  isUpcoming(booking: any): boolean {
    return new Date(booking.date) >= new Date();
  }
}
