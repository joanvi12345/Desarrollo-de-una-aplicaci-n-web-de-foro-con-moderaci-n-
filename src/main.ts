import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Es fundamental pasar 'appConfig' como segundo argumento para que 
// funcionen los servicios (HttpClient) y la configuración del TFG.
bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));