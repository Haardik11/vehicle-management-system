import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    DialogModule,
    ToastModule,
    ButtonModule,
    ProgressSpinnerModule,
    InputNumberModule,
    DropdownModule,
    TagModule,
    TooltipModule,
    InputTextModule
  ],
  providers: [MessageService]
})
export class AdminDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(MessageService);

  vehicles: any[] = [];
  stats = { users: 0, bookings: 0, vehicles: 0 };
  showForm = false;
  editMode = false;
  selectedVehicleId: number | null = null;
  loading = false;
  saving = false;

  // Dropdown options
  vehicleTypes = ['Sedan', 'SUV', 'Truck', 'Van'];
  statusOptions = ['Available', 'In Service', 'Booked'];
  currentYear = new Date().getFullYear();

  form: any = {
    make: '',
    model: '',
    year: null,
    chassisNumber: '',
    type: '',
    capacity: null,
    status: 'Available',
  };

  ngOnInit(): void {
    this.loadVehicles();
    this.loadStats();
  }

  private getAuthHeaders(): HttpHeaders | null {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      this.toast.add({ severity: 'error', summary: 'Authentication', detail: 'Please log in again.' });
      return null;
    }
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  loadVehicles() {
    const headers = this.getAuthHeaders();
    if (!headers) return;

    this.loading = true;
    this.http.get<any[]>('http://127.0.0.1:8000/api/vehicles/', { headers }).subscribe({
      next: (data) => {
        this.vehicles = Array.isArray(data) ? data : [];
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.add({ severity: 'error', summary: 'Load Failed', detail: 'Unable to load vehicles.' });
        console.error(err);
      }
    });
  }

  loadStats() {
    const headers = this.getAuthHeaders();
    if (!headers) return;

    this.http.get<any[]>('http://127.0.0.1:8000/api/users/', { headers }).subscribe({
      next: (users) => (this.stats.users = Array.isArray(users) ? users.length : 0),
      error: () => (this.stats.users = 0)
    });

    this.http.get<any[]>('http://127.0.0.1:8000/api/bookings/', { headers }).subscribe({
      next: (bookings) => (this.stats.bookings = Array.isArray(bookings) ? bookings.length : 0),
      error: () => (this.stats.bookings = 0)
    });

    this.http.get<any[]>('http://127.0.0.1:8000/api/vehicles/', { headers }).subscribe({
      next: (vehicles) => (this.stats.vehicles = Array.isArray(vehicles) ? vehicles.length : 0),
      error: () => (this.stats.vehicles = 0)
    });
  }

  openAddForm() {
    this.resetForm();
    this.editMode = false;
    this.showForm = true;
  }

  openEditForm(vehicle: any) {
    this.form = {
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      chassisNumber: vehicle.chassis_number,
      type: vehicle.vehicle_type,
      capacity: vehicle.capacity,
      status: vehicle.status
    };
    this.selectedVehicleId = vehicle.id;
    this.editMode = true;
    this.showForm = true;
  }

  saveVehicle() {
    const headers = this.getAuthHeaders();
    if (!headers) return;

    const body = {
      make: this.form.make,
      model: this.form.model,
      year: this.form.year,
      chassis_number: this.form.chassisNumber,
      vehicle_type: this.form.type,
      capacity: this.form.capacity,
      status: this.form.status
    };

    const url = this.editMode
      ? `http://127.0.0.1:8000/api/vehicles/${this.selectedVehicleId}/`
      : `http://127.0.0.1:8000/api/vehicles/`;

    this.saving = true;
    const req$ = this.editMode
      ? this.http.put(url, body, { headers })
      : this.http.post(url, body, { headers });

    req$.subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Success', detail: 'Vehicle saved successfully' });
        this.showForm = false;
        this.saving = false;
        this.loadVehicles();
        this.loadStats();
      },
      error: (err) => {
        this.saving = false;
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save vehicle' });
        console.error(err);
      }
    });
  }

  deleteVehicle(vehicle: any) {
    const headers = this.getAuthHeaders();
    if (!headers) return;

    if (confirm(`Delete ${vehicle.make} ${vehicle.model}?`)) {
      this.http.delete(`http://127.0.0.1:8000/api/vehicles/${vehicle.id}/`, { headers }).subscribe({
        next: () => {
          this.toast.add({ severity: 'success', summary: 'Deleted', detail: 'Vehicle deleted' });
          this.loadVehicles();
          this.loadStats();
        },
        error: (err) => {
          this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete vehicle' });
          console.error(err);
        }
      });
    }
  }

  cancelForm() {
    this.showForm = false;
    this.resetForm();
  }

  resetForm() {
    this.form = {
      make: '',
      model: '',
      year: null,
      chassisNumber: '',
      type: '',
      capacity: null,
      status: 'Available',
    };
    this.selectedVehicleId = null;
  }
}