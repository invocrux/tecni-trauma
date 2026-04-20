import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { EquipoDetalle } from '../../../core/models/equipment.model';
import { EquiposService } from '../../../core/services/equipos.service';

type DetailTab = 'description' | 'protocol' | 'warnings';

@Component({
  selector: 'app-equipment-detail',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  templateUrl: './equipment-detail.component.html',
  styleUrl: './equipment-detail.component.scss',
})
export class EquipmentDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly equiposService = inject(EquiposService);

  readonly equipo = signal<EquipoDetalle | null>(null);
  readonly loading = signal<boolean>(true);
  readonly notFound = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly activeTab = signal<DetailTab>('protocol');

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = Number(params.get('id'));

        if (Number.isNaN(id)) {
          this.notFound.set(true);
          this.loading.set(false);
          return;
        }

        void this.loadEquipo(id);
      });
  }

  async loadEquipo(equipoId: number): Promise<void> {
    this.loading.set(true);
    this.notFound.set(false);
    this.errorMessage.set(null);

    try {
      const equipo = await this.equiposService.getEquipoDetalle(equipoId);

      if (!equipo) {
        this.notFound.set(true);
        this.equipo.set(null);
        return;
      }

      this.equipo.set(equipo);
      this.activeTab.set('protocol');
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Failed to load protocol data'
      );
    } finally {
      this.loading.set(false);
    }
  }

  setActiveTab(tab: DetailTab): void {
    this.activeTab.set(tab);
  }

  stepIcon(index: number): string {
    const icons = ['water_drop', 'medical_services', 'airwave', 'opacity'];
    return icons[index % icons.length] ?? 'check_circle';
  }
}
