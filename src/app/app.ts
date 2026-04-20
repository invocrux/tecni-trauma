import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    TranslateModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly translate = inject(TranslateService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentLanguage = signal<'es' | 'en'>('es');
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly isAuthPage = signal(false);
  readonly showAppChrome = computed(() => !this.isAuthPage());
  readonly adminRoute = computed(() =>
    this.isAuthenticated() ? '/admin' : '/login'
  );

  constructor() {
    this.translate.addLangs(['es', 'en']);
    this.translate.setDefaultLang('es');

    const browserLanguage = this.translate.getBrowserLang();
    const selectedLanguage: 'es' | 'en' =
      browserLanguage === 'en' ? 'en' : 'es';

    this.setLanguage(selectedLanguage);

    this.isAuthPage.set(this.router.url.startsWith('/login'));
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.isAuthPage.set(event.urlAfterRedirects.startsWith('/login'));
      });
  }

  setLanguage(language: 'es' | 'en'): void {
    this.translate.use(language);
    this.currentLanguage.set(language);
  }

  async logout(): Promise<void> {
    await this.authService.signOut();
    await this.router.navigate(['/login']);
  }
}
