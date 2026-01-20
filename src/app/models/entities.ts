// User roles
export type UserRole = 'admin' | 'callcenter' | 'user';

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string; // Optional for security
  role: UserRole;
  createdAt?: Date;
}

export type VehicleStatus = 'Available' | 'In Service' | 'Booked';
export type VehicleType = 'Sedan' | 'SUV' | 'Truck' | 'Van';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  chassisNumber: string;
  type: VehicleType;
  capacity: number;
  status: VehicleStatus;
  createdAt?: Date;
}

export type BookingStatus = 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed';

export interface Booking {
  id: string;
  userId: string;
  vehicleId: string;
  startDate: Date;
  endDate: Date;
  pickupLocation: string;
  dropoffLocation: string;
  purpose?: string;
  status: BookingStatus;
  assignedBy?: string; // For call center assignment
  createdAt?: Date;
}