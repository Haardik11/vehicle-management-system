import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import { CalendarOptions } from '@fullcalendar/core';
import { InputTextModule } from 'primeng/inputtext';
import { BadgeModule } from 'primeng/badge';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';

type VehicleLike =
  | number
  | { id: number; make?: string; model?: string; capacity?: number; status?: string }
  | null
  | undefined;

@Component({
  selector: 'app-call-center-dashboard',
  standalone: true,
  templateUrl: './call-center-dashboard.component.html',
  styleUrls: ['./call-center-dashboard.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    DropdownModule,
    ToastModule,
    CalendarModule,
    ButtonModule,
    FullCalendarModule,
    CardModule,
    TagModule,
    InputTextModule,
    BadgeModule,
    DialogModule,
    TooltipModule
  ],
  providers: [MessageService, DatePipe]
})
export class CallcenterDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(MessageService);

  bookings: any[] = [];
  vehicles: any[] = [];
  availableVehicles: any[] = [];
  allVehicleOptions: Array<{ label: string; value: number; capacity: number; status: string }> = [];

  statusOptions = [
    { label: 'Pending', value: 'Pending' },
    { label: 'Confirmed', value: 'Confirmed' },
    { label: 'Cancelled', value: 'Cancelled' },
    { label: 'Completed', value: 'Completed' }
  ];

  filterDate: any = '';
  filterStatus = '';
  searchUser = '';
  searchVehicle = '';

  // keep both string (for comparisons) and Date (for display)
  todayDate = new Date().toISOString().split('T')[0];
  todayDateDate = new Date();

  lastBookingCount = 0;

  totalBookings = 0;
  confirmedBookings = 0;
  pendingBookings = 0;
  cancelledBookings = 0;

  displayBookingDetails = false;
  selectedBookingDetails: any = null;
  sameCapacityVehicles: any[] = [];

  // For the "Assign Vehicle" dialog
  displayVehicleAssignment = false;
  selectedBookingForAssignment: any = null;
  selectedVehicleForAssignment: number | null = null;

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin],
    initialView: 'dayGridMonth',
    events: [],
    height: 'auto',
    eventClick: this.handleEventClick.bind(this)
  };

  ngOnInit() {
    this.loadData();
    this.startPollingForNewBookings();
  }

  // ---------- utils ----------
  private getAuthHeaders(): HttpHeaders | null {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      this.toast.add({ severity: 'error', summary: 'Authentication Required', detail: 'Please log in again.', life: 4000 });
      return null;
    }
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  private toId(v: VehicleLike): number | null {
    if (v == null) return null;
    if (typeof v === 'number') return v;
    if (typeof (v as any).id === 'number') return (v as any).id;
    const n = Number(v as any);
    return Number.isFinite(n) ? n : null;
  }

  private toNumber(val: any): number | null {
    if (typeof val === 'number') return val;
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  }

  private normalizeDateString(d: any): string {
    if (!d) return '';
    if (typeof d === 'string' && d.length >= 10) return d.slice(0, 10);
    if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return '';
  }

  // ---------- load ----------
  loadData() {
    const headers = this.getAuthHeaders();
    if (!headers) return;

    this.http.get<any[]>('http://127.0.0.1:8000/api/bookings/', { headers }).subscribe({
      next: (data) => {
        this.bookings = Array.isArray(data) ? data : [];
        this.totalBookings = this.bookings.length;
        this.confirmedBookings = this.bookings.filter(b => b.status === 'Confirmed').length;
        this.pendingBookings = this.bookings.filter(b => b.status === 'Pending').length;
        this.cancelledBookings = this.bookings.filter(b => b.status === 'Cancelled').length;

        this.calendarOptions.events = this.bookings.map(b => ({
          title: `${this.getUserName(b.user)} - ${b.status}`,
          date: this.normalizeDateString(b.date),
          color: this.getStatusColor(b.status),
          extendedProps: { vehicle: this.getVehicleName(b.vehicle), bookingId: b.id }
        }));
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Load Failed', detail: 'Could not load bookings.' })
    });

    this.http.get<any[]>('http://127.0.0.1:8000/api/vehicles/', { headers }).subscribe({
      next: (data) => {
        this.vehicles = Array.isArray(data) ? data : [];
        this.availableVehicles = this.vehicles.filter(v => v.status === 'Available');
        this.allVehicleOptions = this.availableVehicles.map(v => ({
          label: `${v.make} ${v.model} (${v.capacity} seats)`,
          value: v.id,
          capacity: v.capacity,
          status: v.status
        }));
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Load Failed', detail: 'Could not load vehicles.' })
    });
  }

  // ---------- requested-vehicle helpers ----------
  getVehicleById(id: number | null): any | undefined {
    if (id == null) return undefined;
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v && v.id === id) return v;
    }
    return undefined;
  }

  getRequestedVehicleId(booking: any): number | null {
    return this.toId(booking?.requested_vehicle);
  }

  getRequestedVehicle(booking: any): any | undefined {
    const id = this.getRequestedVehicleId(booking);
    return this.getVehicleById(id);
  }

  getRequestedVehicleCapacity(booking: any): number | null {
    const rv = this.getRequestedVehicle(booking);
    if (rv && typeof rv.capacity === 'number') return rv.capacity;
    if (booking?.requested_vehicle && typeof booking.requested_vehicle.capacity === 'number') return booking.requested_vehicle.capacity;
    return null;
  }

  getRequestedVehicleStatus(booking: any): string {
    const rv = this.getRequestedVehicle(booking);
    return rv?.status || '';
  }

  isRequestedVehicleAvailable(booking: any): boolean {
    return this.getRequestedVehicleStatus(booking) === 'Available';
  }

  // ---------- assignment options ----------
  getVehicleAssignmentOptions(booking: any): Array<{ label: string; value: number; capacity: number }> {
    const options: Array<{ label: string; value: number; capacity: number }> = [];

    // requested first
    const rv = this.getRequestedVehicle(booking);
    if (rv) {
      options.push({ label: `Requested: ${rv.make} ${rv.model} (${rv.capacity} seats)`, value: rv.id, capacity: rv.capacity });
    }

    // same-capacity
    const sameCap = this.getAvailableVehiclesWithSameCapacity(booking);
    for (let i = 0; i < sameCap.length; i++) {
      const v = sameCap[i];
      options.push({ label: `Alternative: ${v.make} ${v.model} (${v.capacity} seats)`, value: v.id, capacity: v.capacity });
    }

    // any available (dedup)
    const used = new Set<number>(options.map(o => o.value));
    for (let i = 0; i < this.availableVehicles.length; i++) {
      const v = this.availableVehicles[i];
      if (!used.has(v.id)) {
        options.push({ label: `Any: ${v.make} ${v.model} (${v.capacity} seats)`, value: v.id, capacity: v.capacity });
      }
    }
    return options;
  }

  getAvailableVehiclesWithSameCapacity(booking: any): any[] {
    const requestedCap = this.getRequestedVehicleCapacity(booking);
    const requestedId = this.getRequestedVehicleId(booking);
    if (requestedCap == null) return [];
    const out: any[] = [];
    for (let i = 0; i < this.availableVehicles.length; i++) {
      const v = this.availableVehicles[i];
      if (v.capacity === requestedCap && v.status === 'Available' && v.id !== requestedId) out.push(v);
    }
    return out;
  }

  // ---------- actions ----------
  showBookingDetails(booking: any) {
    this.selectedBookingDetails = booking;
    this.sameCapacityVehicles = this.getAvailableVehiclesWithSameCapacity(booking);
    this.displayBookingDetails = true;
  }

  showVehicleAssignment(booking: any) {
    this.selectedBookingForAssignment = booking;
    this.selectedVehicleForAssignment = null;
    this.displayVehicleAssignment = true;
  }

  onVehicleDropDownChange(booking: any, event: any) {
    const id = this.toNumber(event?.value);
    if (id != null) this.assignVehicleToBooking(booking, id);
  }

  assignVehicleToBooking(booking: any, vehicleId: number) {
    const headers = this.getAuthHeaders();
    if (!headers) return;

    const body = { vehicle: vehicleId };
    this.http.patch(`http://127.0.0.1:8000/api/bookings/${booking.id}/`, body, { headers }).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Vehicle Assigned', detail: `Assigned ${this.getVehicleName(vehicleId)} to booking` });
        this.loadData();
        this.displayBookingDetails = false;
        this.displayVehicleAssignment = false;
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Assignment Failed', detail: 'Failed to assign vehicle' })
    });
  }

  updateStatus(booking: any, event: any) {
    const headers = this.getAuthHeaders();
    if (!headers) return;

    const newStatus = event?.value;
    const body = { status: newStatus };
    this.http.patch(`http://127.0.0.1:8000/api/bookings/${booking.id}/`, body, { headers }).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Status Updated', detail: `Booking status changed to ${newStatus}` });
        this.loadData();
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Update Failed', detail: 'Failed to update booking status' })
    });
  }

  handleEventClick(info: any) {
    const bookingId = info.event.extendedProps.bookingId;
    const booking = this.bookings.find(b => b.id === bookingId);
    if (booking) this.showBookingDetails(booking);
  }

  // ---------- derived lists ----------
  filteredBookings() {
    const dateStr = this.normalizeDateString(this.filterDate);
    return this.bookings.filter(b => {
      const bDate = this.normalizeDateString(b.date);
      const matchesDate = !dateStr || bDate === dateStr;
      const matchesStatus = !this.filterStatus || b.status === this.filterStatus;
      const matchesUser = !this.searchUser || String(b.user).includes(this.searchUser);
      const vName = this.getVehicleName(b.vehicle).toLowerCase();
      const matchesVehicle = !this.searchVehicle || vName.includes(this.searchVehicle.toLowerCase());
      return matchesDate && matchesStatus && matchesUser && matchesVehicle;
    });
  }

  getTodayBookings() {
    return this.bookings.filter(b => this.normalizeDateString(b.date) === this.todayDate);
  }

  getUpcomingBookings() {
    return this.bookings.filter(b => this.normalizeDateString(b.date) > this.todayDate);
  }

  // ---------- display helpers ----------
  getStatusColor(status: string): string {
    switch (status) {
      case 'Pending': return '#f59e0b';
      case 'Confirmed': return '#10b981';
      case 'Cancelled': return '#ef4444';
      case 'Completed': return '#3b82f6';
      default: return '#6b7280';
    }
  }

  getBookingStatusSeverity(status: string): string {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Confirmed': return 'success';
      case 'Cancelled': return 'danger';
      case 'Completed': return 'info';
      default: return '';
    }
  }

  getSeverity(status: string): string {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Confirmed': return 'success';
      case 'Cancelled': return 'danger';
      case 'Completed': return 'info';
      default: return '';
    }
  }

  getVehicleStatusSeverity(status: string): string {
    switch (status) {
      case 'Available': return 'success';
      case 'Booked': return 'warning';
      case 'Maintenance': return 'danger';
      default: return 'info';
    }
  }

  getUserName(userId: number): string {
    return `User #${userId}`;
  }

  getVehicleName(vehicle: VehicleLike): string {
    const id = this.toId(vehicle);
    if (id == null) return 'Unassigned';
    const v = this.getVehicleById(id);
    return v ? `${v.make} ${v.model}` : `Vehicle #${id}`;
  }

  // ---------- polling ----------
  startPollingForNewBookings() {
    const intervalMs = 15000;
    const tick = () => {
      const headers = this.getAuthHeaders();
      if (!headers) return;
      this.http.get<any[]>('http://127.0.0.1:8000/api/bookings/', { headers }).subscribe({
        next: (data) => {
          const pending = (data ?? []).filter(b => b.status === 'Pending');
          if (pending.length > this.lastBookingCount) {
            this.toast.add({
              severity: 'info',
              summary: 'New Booking Request',
              detail: `${pending.length - this.lastBookingCount} new booking(s) require attention`,
              life: 5000
            });
          }
          this.lastBookingCount = pending.length;
        },
        error: () => {}
      });
    };
    tick();
    setInterval(tick, intervalMs);
  }
}
