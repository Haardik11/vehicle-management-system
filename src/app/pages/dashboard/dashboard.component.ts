import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // Adjust path if needed

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [],
  template: `<p>Redirecting to your dashboard...</p>`,
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit(): void {
    const role = this.authService.getUserRole();

    if (role === 'admin') {
      this.router.navigate(['/admin-dashboard']);
    } else if (role === 'call_center') {
      this.router.navigate(['/call-center-dashboard']);
    } else {
      this.router.navigate(['/user-dashboard']);
    }
  }
}
