import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { UserDashboardComponent } from './user-dashboard.component';

describe('UserDashboardComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserDashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(UserDashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();

    httpMock.match('http://127.0.0.1:8000/api/bookings/');
    httpMock.match('http://127.0.0.1:8000/api/vehicles/');
  });

  it('starts with no vehicles shown until a fetch resolves', () => {
    const fixture = TestBed.createComponent(UserDashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.filteredVehicles).toEqual([]);

    httpMock.match('http://127.0.0.1:8000/api/bookings/');
    httpMock.match('http://127.0.0.1:8000/api/vehicles/');
  });
});
