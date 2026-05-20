import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

interface AdminNavItem {
  labelKey: string;
  route: string;
  icon: string;
  section: 'catalog' | 'users' | 'equipment';
}

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, MatIconModule, TranslateModule],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShellComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUrl = signal(this.router.url);

  readonly navItems: AdminNavItem[] = [
    {
      labelKey: 'adminShell.catalog',
      route: '/',
      icon: 'medical_services',
      section: 'catalog',
    },
    {
      labelKey: 'adminShell.users',
      route: '/admin/usuarios',
      icon: 'group',
      section: 'users',
    },
    {
      labelKey: 'adminShell.equipment',
      route: '/admin',
      icon: 'biotech',
      section: 'equipment',
    },
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
      });
  }

  isActive(item: AdminNavItem): boolean {
    const url = this.currentUrl();

    if (item.section === 'users') {
      return url.startsWith('/admin/usuarios');
    }

    if (item.section === 'equipment') {
      return url === '/admin' || url.startsWith('/admin/equipos');
    }

    return false;
  }
}
