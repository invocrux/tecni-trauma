import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { Equipo } from '../../../core/models/equipment.model';
import { EquiposService } from '../../../core/services/equipos.service';

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent {
  private readonly equiposService = inject(EquiposService);

  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly equipos = signal<Equipo[]>([]);
  readonly currentQuery = signal<string>('');

  private searchTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    void this.loadEquipos('');
  }

  onSearchChange(value: string): void {
    this.currentQuery.set(value);

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      void this.loadEquipos(value);
    }, 280);
  }

  async loadEquipos(query: string): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const equipos = await this.equiposService.getAdminEquipos(query);
      this.equipos.set(equipos);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Failed to load admin equipment data'
      );
    } finally {
      this.loading.set(false);
    }
  }

  async deleteEquipo(equipo: Equipo): Promise<void> {
    const confirmed = window.confirm(
      `Delete equipment "${equipo.nombre}" permanently?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await this.equiposService.deleteEquipo(equipo.id);
      await this.loadEquipos(this.currentQuery());
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Failed to delete equipment'
      );
    }
  }

  trackByEquipoId(_index: number, equipo: Equipo): number {
    return equipo.id;
  }
}
