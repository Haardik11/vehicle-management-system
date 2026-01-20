import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';  // <-- Add this
import { AppRoutingModule } from './app-routing.module';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './services/auth.interceptor';
import { AppComponent } from './app.component';  // <-- Your root component

@NgModule({
  declarations: [
    AppComponent  // <-- Your components go here
  ],
  imports: [
    BrowserModule,
    HttpClientModule,  // <-- Required for HTTP requests
    AppRoutingModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]  // <-- Required for root module
})
export class AppModule { }