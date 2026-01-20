import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { RouterTestingModule } from '@angular/router/testing';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppComponent,           // ✅ Because AppComponent is standalone
        RouterTestingModule     // ✅ If AppComponent uses router-outlet
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy(); // App instance created successfully
  });

  it('should render welcome message', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges(); // Triggers template rendering
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Welcome');
  });
});
