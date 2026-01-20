import { Component, OnInit } from '@angular/core';
import { Vehicle } from '../../models/entities';
import { VehicleService } from '../../services/vehicle.service';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-vehicle-list',
  templateUrl: './vehicle-list.component.html',
  styleUrls: ['./vehicle-list.component.css'], // ✅ fixed typo
  imports: [FormsModule, CommonModule] // ✅ required for ngModel, ngIf, ngFor, pipes
})
export class VehicleListComponent implements OnInit {
  vehicles: Vehicle[] = [];
  filteredVehicles: Vehicle[] = [];
  loading = false;
  error: string | null = null;

  // Search/filter state
  searchType = '';
  searchCapacity: number | null = null;
  searchStatus = 'Available';

  // Booking form state
  showBookingForm = false;
  selectedVehicle: Vehicle | null = null;
  bookingForm: any = {
    startDate: '',
    endDate: '',
    pickupLocation: '',
    dropoffLocation: '',
    purpose: ''
  };
  bookingError: string | null = null;
  bookingLoading = false;
  bookingSuccess: string | null = null;

  constructor(
    private vehicleService: VehicleService,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.fetchVehicles();
  }

  fetchVehicles() {
    this.loading = true;
    this.vehicleService.getVehicles().subscribe({
      next: (vehicles) => {
        this.vehicles = vehicles;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load vehicles.';
        this.loading = false;
      }
    });
  }

  applyFilters() {
    this.filteredVehicles = this.vehicles.filter(v => {
      const matchesType = this.searchType ? v.type === this.searchType : true;
      const matchesCapacity = this.searchCapacity ? v.capacity >= this.searchCapacity : true;
      const matchesStatus = v.status === this.searchStatus;
      return matchesType && matchesCapacity && matchesStatus;
    });
  }

  openBookingForm(vehicle: Vehicle) {
    this.selectedVehicle = vehicle;
    this.showBookingForm = true;
    this.bookingForm = {
      startDate: '',
      endDate: '',
      pickupLocation: '',
      dropoffLocation: '',
      purpose: ''
    };
    this.bookingError = null;
    this.bookingSuccess = null;
  }

  submitBooking() {
    if (!this.selectedVehicle) return;
    this.bookingLoading = true;
    this.bookingError = null;
    this.bookingSuccess = null;
    const userId = this.getUserIdFromToken();
    if (!userId) {
      this.bookingError = 'User not authenticated.';
      this.bookingLoading = false;
      return;
    }
    const booking = {
      userId,
      vehicleId: this.selectedVehicle.id,
      ...this.bookingForm,
      status: 'Pending'
    };
    this.http.post('http://127.0.0.1:8000/api/bookings/', booking).subscribe({
      next: () => {
        this.bookingSuccess = 'Booking request submitted!';
        this.bookingLoading = false;
        this.showBookingForm = false;
      },
      error: () => {
        this.bookingError = 'Failed to submit booking.';
        this.bookingLoading = false;
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

  closeBookingForm() {
    this.showBookingForm = false;
    this.selectedVehicle = null;
  }
}
