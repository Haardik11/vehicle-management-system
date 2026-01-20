import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { VehicleListComponent } from './pages/vehicle-list/vehicle-list.component';
import { BookingsComponent } from './pages/bookings/bookings.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { CallcenterDashboardComponent } from './pages/call-center-dashboard/call-center-dashboard.component';
import { UserDashboardComponent } from './pages/user-dashboard/user-dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'vehicles', component: VehicleListComponent, canActivate: [AuthGuard] },
  { path: 'bookings', component: BookingsComponent, canActivate: [AuthGuard] },
  { path: 'admin-dashboard', component: AdminDashboardComponent, canActivate: [AuthGuard, RoleGuard], data: { roles: ['admin'] } },
  { path: 'call-center-dashboard', component: CallcenterDashboardComponent, canActivate: [AuthGuard, RoleGuard], data: { roles: ['callcenter'] } },
  { path: 'user-dashboard', component: UserDashboardComponent, canActivate: [AuthGuard, RoleGuard], data: { roles: ['user'] } },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
