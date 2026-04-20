import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { Equipo } from '../../../core/models/equipment.model';
import { EquiposService } from '../../../core/services/equipos.service';

@Component({
  selector: 'app-equipment-list',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  templateUrl: './equipment-list.component.html',
  styleUrl: './equipment-list.component.scss',
})
export class EquipmentListComponent {
  private readonly equiposService = inject(EquiposService);

  readonly equipos = signal<Equipo[]>([]);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly currentQuery = signal<string>('');

  private searchTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    void this.loadEquipos('');
  }

  onQuickAction(searchInput: HTMLInputElement): void {
    if (this.currentQuery().trim().length > 0) {
      this.currentQuery.set('');
      searchInput.value = '';
      void this.loadEquipos('');
      return;
    }

    searchInput.focus();
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
      const equipos = await this.equiposService.getPublicEquipos(query);
      this.equipos.set(equipos);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Failed to load equipment list'
      );
    } finally {
      this.loading.set(false);
    }
  }

  trackByEquipoId(_index: number, equipo: Equipo): number {
    return equipo.id;
  }
}
