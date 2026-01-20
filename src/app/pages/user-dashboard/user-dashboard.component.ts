import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css'],
  imports: [CommonModule, FormsModule, ToastModule],
  providers: [MessageService, DatePipe]
})
export class UserDashboardComponent implements OnInit {
  bookings: any[] = [];
  allVehicles: any[] = [];
  filteredVehicles: any[] = [];
  loading = false;
  bookingLoading = false;
  todayDate: string = new Date().toISOString().split('T')[0];

  selectedDate: string = '';
  selectedCapacity: string = '';

  showBookingForm = false;
  selectedVehicle: any = null;
  bookingTime: string = '';
  bookingPurpose: string = '';
  pickupLocation: string = '';
  dropLocation: string = '';

  currentUserId: number | null = null;

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('auth_token');
    if (token) this.currentUserId = this.getUserIdFromToken(token);
    this.filteredVehicles = [];
    this.fetchBookings();
    this.fetchAllVehicles();
  }

  fetchBookings(): void {
    this.loading = true;
    const token = localStorage.getItem('auth_token');
    if (!token) {
      this.showAuthError();
      this.loading = false;
      return;
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.get<any[]>(`http://127.0.0.1:8000/api/bookings/`, { headers }).subscribe({
      next: (data) => {
        this.bookings = Array.isArray(data) ? data : [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching bookings:', err);
        this.showError('Failed to fetch your bookings');
        this.loading = false;
      }
    });
  }

  fetchAllVehicles(): void {
    this.loading = true;
    const token = localStorage.getItem('auth_token');
    if (!token) {
      this.showAuthError();
      this.loading = false;
      return;
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.get<any[]>('http://127.0.0.1:8000/api/vehicles/', { headers }).subscribe({
      next: (data) => {
        this.allVehicles = Array.isArray(data) ? data : [];
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching vehicles:', err);
        this.showError('Failed to fetch vehicles');
        this.loading = false;
      }
    });
  }

  fetchAvailableVehicles(): void {
    this.loading = true;
    const token = localStorage.getItem('auth_token');
    if (!token) {
      this.showAuthError();
      this.loading = false;
      return;
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    let url = `http://127.0.0.1:8000/api/vehicles/available/?date=${this.selectedDate}`;
    if (this.selectedCapacity) url += `&capacity=${this.selectedCapacity}`;

    this.http.get<any[]>(url, { headers }).subscribe({
      next: (data) => {
        this.filteredVehicles = Array.isArray(data) ? data : [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching available vehicles:', err);
        this.showError('Failed to fetch available vehicles');
        this.filteredVehicles = [];
        this.loading = false;
      }
    });
  }

  onDateChange(): void {
    if (this.selectedDate) this.fetchAvailableVehicles();
    else this.applyFilters();
  }

  applyFilters(): void {
    if (!this.selectedDate) {
      this.filteredVehicles = this.allVehicles.filter(v =>
        v.status === 'Available' &&
        (!this.selectedCapacity || v.capacity == +this.selectedCapacity)
      );
    } else {
      this.fetchAvailableVehicles();
    }
  }

  openBookingForm(vehicle: any): void {
    if (!this.selectedDate) {
      this.showWarning('Please select a date first');
      return;
    }

    const selectedDateObj = new Date(this.selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDateObj < today) {
      this.showError('Booking date cannot be in the past');
      return;
    }

    this.selectedVehicle = vehicle;
    this.showBookingForm = true;
  }

  confirmBooking(): void {
    if (!this.selectedVehicle || !this.selectedDate || !this.bookingTime || !this.pickupLocation || !this.dropLocation) {
      this.showWarning('Please fill all required fields');
      return;
    }

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(this.bookingTime)) {
      this.showError('Please enter a valid time in HH:MM format (24-hour)');
      return;
    }

    this.bookingLoading = true;
    const token = localStorage.getItem('auth_token');
    if (!token) {
      this.showAuthError();
      this.bookingLoading = false;
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const body = {
      vehicle: this.selectedVehicle.id,
      pickup_location: this.pickupLocation,
      drop_location: this.dropLocation,
      date: this.selectedDate,
      time: this.bookingTime,
      status: 'Pending',
      purpose: this.bookingPurpose || 'General use'
    };

    this.http.post('http://127.0.0.1:8000/api/bookings/', body, { headers }).subscribe({
      next: () => {
        this.showSuccess('Booking created successfully!');
        this.fetchBookings();
        this.fetchAvailableVehicles();
        this.showBookingForm = false;
        this.clearForm();
        this.bookingLoading = false;
      },
      error: (err) => {
        console.error('Booking error:', err);
        let errorDetail = 'Booking failed. Please try again.';
        if (err?.error) {
          if (typeof err.error === 'object') {
            errorDetail = 'Validation errors:\n';
            for (const [field, messages] of Object.entries(err.error)) {
              errorDetail += `${field}: ${(messages as string[]).join(', ')}\n`;
            }
          } else if ((err as any).error?.detail) {
            errorDetail = (err as any).error.detail;
          }
        }
        this.showError(errorDetail);
        this.bookingLoading = false;
      }
    });
  }

  cancelBooking(bookingId: number): void {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    const token = localStorage.getItem('auth_token');
    if (!token) {
      this.showAuthError();
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.patch(
      `http://127.0.0.1:8000/api/bookings/${bookingId}/`,
      { status: 'Cancelled' },
      { headers }
    ).subscribe({
      next: () => {
        this.showSuccess('Booking cancelled successfully');
        this.fetchBookings();
        this.fetchAvailableVehicles();
      },
      error: (err) => {
        console.error('Cancel booking error:', err);
        this.showError(err.error?.detail || 'Failed to cancel booking');
      }
    });
  }

  private getUserIdFromToken(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user_id ?? null;
    } catch (e) {
      console.error('Error decoding token:', e);
      return null;
    }
  }

  private showError(message: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: message, life: 5000 });
  }

  private showWarning(message: string): void {
    this.messageService.add({ severity: 'warn', summary: 'Warning', detail: message, life: 3000 });
  }

  private showSuccess(message: string): void {
    this.messageService.add({ severity: 'success', summary: 'Success', detail: message, life: 3000 });
  }

  private showAuthError(): void {
    this.showError('Authentication token missing. Please login again.');
  }

  clearForm(): void {
    this.selectedVehicle = null;
    this.bookingTime = '';
    this.bookingPurpose = '';
    this.pickupLocation = '';
    this.dropLocation = '';
  }

  getVehicleName(vehicleId: number): string {
    const vehicle = this.allVehicles.find(v => v.id === vehicleId) ||
                    this.filteredVehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehicle';
  }

  getUpcomingBookings(): any[] {
    if (!this.bookings) return [];
    const today = new Date(this.todayDate);
    return this.bookings.filter(b => new Date(b.date) >= today);
  }

  getPastBookings(): any[] {
    if (!this.bookings) return [];
    const today = new Date(this.todayDate);
    return this.bookings.filter(b => new Date(b.date) < today);
  }

  formatBookingDetails(booking: any): string {
    const formattedDate = this.datePipe.transform(booking.date, 'mediumDate');
    let formattedTime = booking.time || 'N/A';
    
    // If time is in format like "12:00:00", extract just the hours and minutes
    if (formattedTime.includes(':')) {
      const timeParts = formattedTime.split(':');
      if (timeParts.length >= 2) {
        formattedTime = `${timeParts[0]}:${timeParts[1]}`;
      }
    }
    
    return `
      Date: ${formattedDate || 'N/A'}
      Time: ${formattedTime}
      Pickup: ${booking.pickup_location || 'N/A'}
      Drop-off: ${booking.drop_location || 'N/A'}
      Purpose: ${booking.purpose || 'N/A'}
    `;
  }
}