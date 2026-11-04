import { bootstrapApplication } from '@angular/platform-browser';
import { provideZoneChangeDetection } from '@angular/core';
import { AppComponent } from './app';
bootstrapApplication(AppComponent,{providers:[provideZoneChangeDetection()]}).catch(console.error);
