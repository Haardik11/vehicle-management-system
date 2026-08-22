import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },

  {
    path: 'admin-dashboard',
    loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] }
  },
  {
    path: 'callcenter-dashboard',
    loadComponent: () => import('./pages/call-center-dashboard/call-center-dashboard.component').then(m => m.CallcenterDashboardComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin', 'call_center'] }
  },
  {
    path: 'user-dashboard',
    loadComponent: () => import('./pages/user-dashboard/user-dashboard.component').then(m => m.UserDashboardComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['normal'] }
  },

  {
    path: 'vehicles',
    loadComponent: () => import('./pages/vehicle-list/vehicle-list.component').then(m => m.VehicleListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'bookings',
    loadComponent: () => import('./pages/bookings/bookings.component').then(m => m.BookingsComponent),
    canActivate: [AuthGuard]
  }
];
