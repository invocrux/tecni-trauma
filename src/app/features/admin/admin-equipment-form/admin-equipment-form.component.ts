import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import {
  EquipoInput,
  EstadoMantenimiento,
  PasoInput,
  VideoInput,
} from '../../../core/models/equipment.model';
import { EquiposService } from '../../../core/services/equipos.service';
import { StorageService } from '../../../core/services/storage.service';

interface PasoFormModel {
  titulo: FormControl<string>;
  descripcion: FormControl<string>;
  advertencias: FormControl<string>;
  imagenesTexto: FormControl<string>;
}

interface EquipoFormModel {
  nombre: FormControl<string>;
  marca: FormControl<string>;
  estadoMantenimiento: FormControl<EstadoMantenimiento>;
  descripcion: FormControl<string>;
  advertenciasTecnicas: FormControl<string>;
  fotoPrincipalUrl: FormControl<string>;
  imagenesEquipoTexto: FormControl<string>;
  videoTitulo: FormControl<string>;
  videoUrl: FormControl<string>;
  pasos: FormArray<FormGroup<PasoFormModel>>;
}

@Component({
  selector: 'app-admin-equipment-form',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  templateUrl: './admin-equipment-form.component.html',
  styleUrl: './admin-equipment-form.component.scss',
})
export class AdminEquipmentFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly equiposService = inject(EquiposService);
  private readonly storageService = inject(StorageService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal<boolean>(true);
  readonly saving = signal<boolean>(false);
  readonly uploadInProgress = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly equipoId = signal<number | null>(null);
  readonly isEditMode = computed(() => this.equipoId() !== null);
  readonly maintenanceStates: EstadoMantenimiento[] = [
    'pendiente',
    'limpio',
    'en_proceso',
  ];

  readonly form: FormGroup<EquipoFormModel> = this.fb.group({
    nombre: this.fb.nonNullable.control('', [Validators.required]),
    marca: this.fb.nonNullable.control(''),
    estadoMantenimiento: this.fb.nonNullable.control<EstadoMantenimiento>('pendiente'),
    descripcion: this.fb.nonNullable.control(''),
    advertenciasTecnicas: this.fb.nonNullable.control(''),
    fotoPrincipalUrl: this.fb.nonNullable.control(''),
    imagenesEquipoTexto: this.fb.nonNullable.control(''),
    videoTitulo: this.fb.nonNullable.control(''),
    videoUrl: this.fb.nonNullable.control(''),
    pasos: this.fb.array<FormGroup<PasoFormModel>>([]),
  });

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const idParam = params.get('id');

        if (!idParam) {
          this.resetForNewEquipment();
          return;
        }

        const id = Number(idParam);

        if (Number.isNaN(id)) {
          this.errorMessage.set('Invalid equipment id');
          this.loading.set(false);
          return;
        }

        this.equipoId.set(id);
        void this.loadEquipo(id);
      });
  }

  get pasos(): FormArray<FormGroup<PasoFormModel>> {
    return this.form.controls.pasos;
  }

  addPaso(): void {
    this.pasos.push(this.createPasoForm());
  }

  removePaso(index: number): void {
    if (this.pasos.length <= 1) {
      this.pasos.at(0).reset({
        titulo: '',
        descripcion: '',
        advertencias: '',
        imagenesTexto: '',
      });
      return;
    }

    this.pasos.removeAt(index);
  }

  movePasoUp(index: number): void {
    if (index === 0) {
      return;
    }

    const control = this.pasos.at(index);
    this.pasos.removeAt(index);
    this.pasos.insert(index - 1, control);
  }

  movePasoDown(index: number): void {
    if (index >= this.pasos.length - 1) {
      return;
    }

    const control = this.pasos.at(index);
    this.pasos.removeAt(index);
    this.pasos.insert(index + 1, control);
  }

  async uploadMainImage(event: Event): Promise<void> {
    const file = this.extractFile(event);

    if (!file) {
      return;
    }

    this.uploadInProgress.set(true);

    try {
      const uploaded = await this.storageService.uploadImage(file, 'portadas');
      this.form.controls.fotoPrincipalUrl.setValue(uploaded.publicUrl);
      this.appendUrlToMultilineControl(this.form.controls.imagenesEquipoTexto, uploaded.publicUrl);
      this.snackBar.open('Main image uploaded', 'OK', { duration: 2200 });
    } catch (error) {
      this.errorMessage.set(this.storageService.getErrorMessage(error));
    } finally {
      this.uploadInProgress.set(false);
    }
  }

  async uploadEquipmentImage(event: Event): Promise<void> {
    const file = this.extractFile(event);

    if (!file) {
      return;
    }

    this.uploadInProgress.set(true);

    try {
      const uploaded = await this.storageService.uploadImage(file, 'equipos');
      this.appendUrlToMultilineControl(this.form.controls.imagenesEquipoTexto, uploaded.publicUrl);

      if (this.form.controls.fotoPrincipalUrl.value.trim().length === 0) {
        this.form.controls.fotoPrincipalUrl.setValue(uploaded.publicUrl);
      }

      this.snackBar.open('Equipment image uploaded', 'OK', { duration: 2200 });
    } catch (error) {
      this.errorMessage.set(this.storageService.getErrorMessage(error));
    } finally {
      this.uploadInProgress.set(false);
    }
  }

  async uploadStepImage(stepIndex: number, event: Event): Promise<void> {
    const file = this.extractFile(event);

    if (!file) {
      return;
    }

    this.uploadInProgress.set(true);

    try {
      const uploaded = await this.storageService.uploadImage(file, 'pasos');
      const control = this.pasos.at(stepIndex).controls.imagenesTexto;
      const currentValue = control.value.trim();
      control.setValue(
        currentValue.length > 0
          ? `${currentValue}\n${uploaded.publicUrl}`
          : uploaded.publicUrl
      );

      this.snackBar.open('Step image uploaded', 'OK', { duration: 2200 });
    } catch (error) {
      this.errorMessage.set(this.storageService.getErrorMessage(error));
    } finally {
      this.uploadInProgress.set(false);
    }
  }

  async uploadVideo(event: Event): Promise<void> {
    const file = this.extractFile(event);

    if (!file) {
      return;
    }

    this.uploadInProgress.set(true);

    try {
      const uploaded = await this.storageService.uploadVideo(file, 'equipos');
      this.form.controls.videoUrl.setValue(uploaded.publicUrl);
      this.snackBar.open('Video uploaded', 'OK', { duration: 2200 });
    } catch (error) {
      this.errorMessage.set(this.storageService.getErrorMessage(error));
    } finally {
      this.uploadInProgress.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    try {
      const raw = this.form.getRawValue();

      const payload: EquipoInput = {
        nombre: raw.nombre.trim(),
        marca: this.toNullable(raw.marca),
        estado_mantenimiento: raw.estadoMantenimiento,
        descripcion: this.toNullable(raw.descripcion),
        advertencias_tecnicas: this.toNullable(raw.advertenciasTecnicas),
        foto_principal_url: this.toNullable(raw.fotoPrincipalUrl),
        activo: true,
      };

      let currentEquipoId = this.equipoId();

      if (currentEquipoId === null) {
        currentEquipoId = await this.equiposService.createEquipo(payload);
        this.equipoId.set(currentEquipoId);
      } else {
        await this.equiposService.updateEquipo(currentEquipoId, payload);
      }

      const pasos: PasoInput[] = raw.pasos.map((paso, index) => ({
        orden: index + 1,
        titulo: paso.titulo.trim(),
        descripcion: paso.descripcion.trim(),
        advertencias: this.toNullable(paso.advertencias),
        imagenes: this.equiposService.parseImageLines(paso.imagenesTexto),
      }));

      const videoUrl = raw.videoUrl.trim();
      const video: VideoInput | null =
        videoUrl.length > 0
          ? {
              titulo: this.toNullable(raw.videoTitulo),
              url_storage: videoUrl,
            }
          : null;

      const mainPhotoUrl = raw.fotoPrincipalUrl.trim();
      let imagenesEquipo = this.equiposService.parseEquipoImageLines(
        raw.imagenesEquipoTexto
      );

      if (mainPhotoUrl.length > 0) {
        const hasMainPhoto = imagenesEquipo.some((imagen) => imagen.url === mainPhotoUrl);

        if (!hasMainPhoto) {
          imagenesEquipo = [
            {
              url: mainPhotoUrl,
              alt_text: null,
              orden: 1,
              es_principal: true,
            },
            ...imagenesEquipo.map((imagen, index) => ({
              ...imagen,
              orden: index + 2,
              es_principal: false,
            })),
          ];
        } else {
          imagenesEquipo = imagenesEquipo.map((imagen, index) => ({
            ...imagen,
            orden: index + 1,
            es_principal: imagen.url === mainPhotoUrl,
          }));
        }
      }

      await this.equiposService.saveProtocolo(
        currentEquipoId,
        pasos,
        video,
        imagenesEquipo
      );

      this.snackBar.open('Equipment saved', 'OK', { duration: 2600 });
      await this.router.navigate(['/admin']);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Failed to save equipment data'
      );
    } finally {
      this.saving.set(false);
    }
  }

  trackByStepIndex(index: number, _step: AbstractControl): number {
    return index;
  }

  private resetForNewEquipment(): void {
    this.equipoId.set(null);
    this.errorMessage.set(null);

    this.form.reset({
      nombre: '',
      marca: '',
      estadoMantenimiento: 'pendiente',
      descripcion: '',
      advertenciasTecnicas: '',
      fotoPrincipalUrl: '',
      imagenesEquipoTexto: '',
      videoTitulo: '',
      videoUrl: '',
    });

    this.clearSteps();
    this.addPaso();
    this.loading.set(false);
  }

  private async loadEquipo(equipoId: number): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const equipo = await this.equiposService.getEquipoDetalle(equipoId, true);

      if (!equipo) {
        this.errorMessage.set('Equipment not found');
        return;
      }

      this.form.patchValue({
        nombre: equipo.nombre,
        marca: equipo.marca ?? '',
        estadoMantenimiento: equipo.estado_mantenimiento,
        descripcion: equipo.descripcion ?? '',
        advertenciasTecnicas: equipo.advertencias_tecnicas ?? '',
        fotoPrincipalUrl: equipo.foto_principal_url ?? '',
        imagenesEquipoTexto: equipo.imagenes_equipo
          .map((imagen) => imagen.url)
          .join('\n'),
        videoTitulo: equipo.video?.titulo ?? '',
        videoUrl: equipo.video?.url_storage ?? '',
      });

      this.clearSteps();

      if (equipo.pasos.length === 0) {
        this.addPaso();
      } else {
        for (const paso of equipo.pasos) {
          this.pasos.push(
            this.createPasoForm({
              titulo: paso.titulo,
              descripcion: paso.descripcion,
              advertencias: paso.advertencias ?? '',
              imagenesTexto: paso.imagenes.map((imagen) => imagen.url).join('\n'),
            })
          );
        }
      }
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Failed to load equipment data'
      );
    } finally {
      this.loading.set(false);
    }
  }

  private createPasoForm(initial?: {
    titulo?: string;
    descripcion?: string;
    advertencias?: string;
    imagenesTexto?: string;
  }): FormGroup<PasoFormModel> {
    return this.fb.group({
      titulo: this.fb.nonNullable.control(initial?.titulo ?? '', [
        Validators.required,
      ]),
      descripcion: this.fb.nonNullable.control(initial?.descripcion ?? '', [
        Validators.required,
      ]),
      advertencias: this.fb.nonNullable.control(initial?.advertencias ?? ''),
      imagenesTexto: this.fb.nonNullable.control(initial?.imagenesTexto ?? ''),
    });
  }

  private clearSteps(): void {
    while (this.pasos.length > 0) {
      this.pasos.removeAt(0);
    }
  }

  private extractFile(event: Event): File | null {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;
    input.value = '';
    return file;
  }

  private toNullable(value: string): string | null {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private appendUrlToMultilineControl(control: FormControl<string>, url: string): void {
    const normalizedUrl = url.trim();

    if (normalizedUrl.length === 0) {
      return;
    }

    const lines = control.value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.includes(normalizedUrl)) {
      return;
    }

    control.setValue([...lines, normalizedUrl].join('\n'));
  }
}
