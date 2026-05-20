import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { Equipo } from '../../../core/models/equipment.model';
import { EquiposService } from '../../../core/services/equipos.service';

interface BrandFilterOption {
  id: number;
  nombre: string;
}

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
  readonly brands = signal<BrandFilterOption[]>([]);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly currentQuery = signal<string>('');
  readonly selectedBrandId = signal<number | null>(null);
  readonly isFilterOpen = signal<boolean>(false);

  private searchTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    void this.loadBrands();
    void this.loadEquipos('');
  }

  toggleBrandFilter(): void {
    this.isFilterOpen.update((value) => !value);
  }

  onSearchChange(value: string): void {
    this.currentQuery.set(value);

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      void this.loadEquipos(value, this.selectedBrandId());
    }, 280);
  }

  async loadEquipos(query: string, brandId: number | null = this.selectedBrandId()): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const equipos = await this.equiposService.getPublicEquiposByFilters(query, brandId);
      this.equipos.set(equipos);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Failed to load equipment list'
      );
    } finally {
      this.loading.set(false);
    }
  }

  async loadBrands(): Promise<void> {
    try {
      const brands = await this.equiposService.getBrands();
      this.brands.set(brands);
    } catch {
      this.brands.set([]);
    }
  }

  async selectBrand(brandId: number | null): Promise<void> {
    this.selectedBrandId.set(brandId);
    await this.loadEquipos(this.currentQuery(), brandId);
  }

  selectedBrandName(): string | null {
    const brandId = this.selectedBrandId();

    if (brandId === null) {
      return null;
    }

    return this.brands().find((brand) => brand.id === brandId)?.nombre ?? null;
  }

  trackByEquipoId(_index: number, equipo: Equipo): number {
    return equipo.id;
  }
}
