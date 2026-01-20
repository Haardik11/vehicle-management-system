import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { VehicleListComponent } from './pages/vehicle-list/vehicle-list.component';
import { BookingsComponent } from './pages/bookings/bookings.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { CallcenterDashboardComponent } from './pages/call-center-dashboard/call-center-dashboard.component';


import { UserDashboardComponent } from './pages/user-dashboard/user-dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent },

  { path: 'admin-dashboard', component: AdminDashboardComponent },
  { path: 'callcenter-dashboard', component: CallcenterDashboardComponent },
  { path: 'user-dashboard', component: UserDashboardComponent },

  { path: 'vehicles', component: VehicleListComponent },
  { path: 'bookings', component: BookingsComponent }
];
