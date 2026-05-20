import { Injectable, inject } from '@angular/core';
import {
  Equipo,
  EquipoDetalle,
  EquipoImagen,
  EquipoImageInput,
  EquipoInput,
  EsterilizacionEquipo,
  EsterilizacionEquipoInput,
  EstadoMantenimiento,
  FichaTecnica,
  FichaTecnicaInput,
  ImagenPaso,
  PasoInput,
  PasoLimpieza,
  StepImageInput,
  VideoEquipo,
  VideoInput,
} from '../models/equipment.model';
import { SupabaseService } from './supabase.service';

interface EquipoDbRow {
  id: number;
  nombre: string;
  id_marca: number | null;
  descripcion: string | null;
  advertencias: string | null;
  estado: boolean;
  created_at: string;
}

interface ImagenEquipoDbRow {
  id: number;
  id_equipo: number;
  url_imagen: string;
  descripcion: string | null;
  created_at: string;
}

interface PasoLimpiezaDbRow {
  id: number;
  id_equipo: number;
  numero_paso: number;
  titulo: string | null;
  descripcion: string;
  created_at: string;
}

interface VideoEquipoDbRow {
  id: number;
  id_equipo: number;
  url_video: string;
  titulo: string | null;
  created_at: string;
}

interface FichaTecnicaDbRow {
  id: number;
  id_equipo: number;
  nombre_documento: string | null;
  url_pdf: string | null;
  descripcion: string | null;
  created_at: string;
}

interface EsterilizacionEquipoDbRow {
  id: number;
  id_equipo: number;
  metodo: string | null;
  temperatura: string | null;
  tiempo: string | null;
  observaciones: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class EquiposService {
  private readonly supabase = inject(SupabaseService).client;

  async getPublicEquipos(search = ''): Promise<Equipo[]> {
    return this.getPublicEquiposByFilters(search, null);
  }

  async getPublicEquiposByFilters(
    search = '',
    brandId: number | null = null
  ): Promise<Equipo[]> {
    const { data, error } = await this.supabase
      .from('equipos')
      .select('id,nombre,id_marca,descripcion,advertencias,estado,created_at')
      .eq('estado', true)
      .order('nombre', { ascending: true });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as EquipoDbRow[];
    const brandsMap = await this.loadBrandsMap(rows.map((equipo) => equipo.id_marca));
    const mainImageMap = await this.loadMainImagesMap(rows.map((equipo) => equipo.id));
    const mapped = rows.map((equipo) => this.mapEquipoRow(equipo, brandsMap, mainImageMap));

    return this.filterBySearch(this.filterByBrand(mapped, brandId), search);
  }

  async getBrands(): Promise<Array<{ id: number; nombre: string }>> {
    const { data, error } = await this.supabase
      .from('marcas')
      .select('id,nombre')
      .order('nombre', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []) as Array<{ id: number; nombre: string }>;
  }

  async getAdminEquipos(search = ''): Promise<Equipo[]> {
    const { data, error } = await this.supabase
      .from('equipos')
      .select('id,nombre,id_marca,descripcion,advertencias,estado,created_at')
      .order('nombre', { ascending: true });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as EquipoDbRow[];
    const brandsMap = await this.loadBrandsMap(rows.map((equipo) => equipo.id_marca));
    const mainImageMap = await this.loadMainImagesMap(rows.map((equipo) => equipo.id));
    const mapped = rows.map((equipo) => this.mapEquipoRow(equipo, brandsMap, mainImageMap));

    return this.filterBySearch(mapped, search);
  }

  async getEquipoDetalle(
    equipoId: number,
    includeInactive = false
  ): Promise<EquipoDetalle | null> {
    let equipoQuery = this.supabase
      .from('equipos')
      .select('id,nombre,id_marca,descripcion,advertencias,estado,created_at')
      .eq('id', equipoId);

    if (!includeInactive) {
      equipoQuery = equipoQuery.eq('estado', true);
    }

    const { data: equipoData, error: equipoError } = await equipoQuery.maybeSingle();

    if (equipoError) {
      throw equipoError;
    }

    if (!equipoData) {
      return null;
    }

    const equipoRow = equipoData as EquipoDbRow;
    const brandsMap = await this.loadBrandsMap([equipoRow.id_marca]);

    const { data: imagenesData, error: imagenesError } = await this.supabase
      .from('imagenes_equipo')
      .select('*')
      .eq('id_equipo', equipoId)
      .order('id', { ascending: true });

    if (imagenesError) {
      throw imagenesError;
    }

    const imagenesEquipo = (imagenesData ?? []) as ImagenEquipoDbRow[];

    const { data: pasosData, error: pasosError } = await this.supabase
      .from('pasos_limpieza')
      .select('*')
      .eq('id_equipo', equipoId)
      .order('numero_paso', { ascending: true });

    if (pasosError) {
      throw pasosError;
    }

    const pasos = ((pasosData ?? []) as PasoLimpiezaDbRow[]).map((paso) =>
      this.mapPasoRow(paso)
    );

    const { data: videoData, error: videoError } = await this.supabase
      .from('videos_equipo')
      .select('*')
      .eq('id_equipo', equipoId)
      .maybeSingle();

    if (videoError) {
      throw videoError;
    }

    const { data: fichaData, error: fichaError } = await this.supabase
      .from('fichas_tecnicas')
      .select('*')
      .eq('id_equipo', equipoId)
      .order('id', { ascending: false })
      .limit(1);

    if (fichaError) {
      throw fichaError;
    }

    const { data: esterilizacionData, error: esterilizacionError } = await this.supabase
      .from('esterilizacion_equipo')
      .select('*')
      .eq('id_equipo', equipoId)
      .order('id', { ascending: false })
      .limit(1);

    if (esterilizacionError) {
      throw esterilizacionError;
    }

    const mappedEquipo = this.mapEquipoRow(equipoRow, brandsMap);
    const mainPhotoFromImages = imagenesEquipo.at(0)?.url_imagen ?? null;

    return {
      ...mappedEquipo,
      foto_principal_url: mainPhotoFromImages ?? mappedEquipo.foto_principal_url,
      imagenes_equipo: imagenesEquipo.map((imagen, index) =>
        this.mapImagenEquipoRow(imagen, index)
      ),
      pasos,
      video: this.mapVideoRow((videoData as VideoEquipoDbRow | null) ?? null),
      ficha_tecnica: this.mapFichaTecnicaRow(
        ((fichaData ?? []) as FichaTecnicaDbRow[]).at(0) ?? null
      ),
      esterilizacion: this.mapEsterilizacionRow(
        ((esterilizacionData ?? []) as EsterilizacionEquipoDbRow[]).at(0) ?? null
      ),
    };
  }

  async createEquipo(payload: EquipoInput): Promise<number> {
    const marcaId = await this.resolveMarcaId(this.normalizeNullable(payload.marca));

    const { data, error } = await this.supabase
      .from('equipos')
      .insert({
        nombre: payload.nombre.trim(),
        id_marca: marcaId,
        descripcion: this.normalizeNullable(payload.descripcion),
        advertencias: this.normalizeNullable(payload.advertencias_tecnicas),
        estado: payload.activo,
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return data.id as number;
  }

  async updateEquipo(equipoId: number, payload: EquipoInput): Promise<void> {
    const marcaId = await this.resolveMarcaId(this.normalizeNullable(payload.marca));

    const { error } = await this.supabase
      .from('equipos')
      .update({
        nombre: payload.nombre.trim(),
        id_marca: marcaId,
        descripcion: this.normalizeNullable(payload.descripcion),
        advertencias: this.normalizeNullable(payload.advertencias_tecnicas),
        estado: payload.activo,
      })
      .eq('id', equipoId);

    if (error) {
      throw error;
    }
  }

  async setEquipoActivo(equipoId: number, activo: boolean): Promise<void> {
    const { error } = await this.supabase
      .from('equipos')
      .update({ estado: activo })
      .eq('id', equipoId);

    if (error) {
      throw error;
    }
  }

  async deleteEquipo(equipoId: number): Promise<void> {
    const { error } = await this.supabase
      .from('equipos')
      .delete()
      .eq('id', equipoId);

    if (error) {
      throw error;
    }
  }

  async saveProtocolo(
    equipoId: number,
    pasos: PasoInput[],
    video: VideoInput | null,
    imagenesEquipo: EquipoImageInput[] = []
  ): Promise<void> {
    const { error: deleteVideoError } = await this.supabase
      .from('videos_equipo')
      .delete()
      .eq('id_equipo', equipoId);

    if (deleteVideoError) {
      throw deleteVideoError;
    }

    const { error: deletePasosError } = await this.supabase
      .from('pasos_limpieza')
      .delete()
      .eq('id_equipo', equipoId);

    if (deletePasosError) {
      throw deletePasosError;
    }

    const { error: deleteImagesError } = await this.supabase
      .from('imagenes_equipo')
      .delete()
      .eq('id_equipo', equipoId);

    if (deleteImagesError) {
      throw deleteImagesError;
    }

    const normalizedImages = this.normalizeEquipoImages(imagenesEquipo);

    if (normalizedImages.length > 0) {
      const { error: insertImagesError } = await this.supabase
        .from('imagenes_equipo')
        .insert(
          normalizedImages.map((imagen) => ({
            id_equipo: equipoId,
            url_imagen: imagen.url,
            descripcion: imagen.alt_text,
          }))
        );

      if (insertImagesError) {
        throw insertImagesError;
      }
    }

    const cleanedPasos = pasos
      .map((paso, index) => ({
        id_equipo: equipoId,
        numero_paso: index + 1,
        titulo: this.normalizeNullable(paso.titulo) ?? `Paso ${index + 1}`,
        descripcion: paso.descripcion.trim(),
      }))
      .filter((paso) => paso.descripcion.length > 0);

    if (cleanedPasos.length > 0) {
      const { error: insertPasosError } = await this.supabase
        .from('pasos_limpieza')
        .insert(cleanedPasos);

      if (insertPasosError) {
        throw insertPasosError;
      }
    }

    if (video) {
      const videoUrl = video.url_storage.trim();

      if (videoUrl.length > 0) {
        const { error: insertVideoError } = await this.supabase
          .from('videos_equipo')
          .insert({
            id_equipo: equipoId,
            titulo: this.normalizeNullable(video.titulo),
            url_video: videoUrl,
          });

        if (insertVideoError) {
          throw insertVideoError;
        }
      }
    }
  }

  async saveTechnicalSheet(
    equipoId: number,
    fichaTecnica: FichaTecnicaInput
  ): Promise<void> {
    const normalized = this.normalizeFichaTecnicaInput(fichaTecnica);

    const { error: deleteError } = await this.supabase
      .from('fichas_tecnicas')
      .delete()
      .eq('id_equipo', equipoId);

    if (deleteError) {
      throw deleteError;
    }

    if (!normalized) {
      return;
    }

    const { error: insertError } = await this.supabase
      .from('fichas_tecnicas')
      .insert({
        id_equipo: equipoId,
        nombre_documento: normalized.nombre_documento,
        url_pdf: normalized.url_pdf,
        descripcion: normalized.descripcion,
      });

    if (insertError) {
      throw insertError;
    }
  }

  async saveSterilization(
    equipoId: number,
    esterilizacion: EsterilizacionEquipoInput
  ): Promise<void> {
    const normalized = this.normalizeEsterilizacionInput(esterilizacion);

    const { error: deleteError } = await this.supabase
      .from('esterilizacion_equipo')
      .delete()
      .eq('id_equipo', equipoId);

    if (deleteError) {
      throw deleteError;
    }

    if (!normalized) {
      return;
    }

    const { error: insertError } = await this.supabase
      .from('esterilizacion_equipo')
      .insert({
        id_equipo: equipoId,
        metodo: normalized.metodo,
        temperatura: normalized.temperatura,
        tiempo: normalized.tiempo,
        observaciones: normalized.observaciones,
      });

    if (insertError) {
      throw insertError;
    }
  }

  parseImageLines(lines: string): StepImageInput[] {
    return lines
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => ({
        url: line,
        alt_text: null,
      }));
  }

  parseEquipoImageLines(lines: string): EquipoImageInput[] {
    const urls = Array.from(
      new Set(
        lines
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
      )
    );

    return urls.map((url, index) => ({
      url,
      alt_text: null,
      orden: index + 1,
      es_principal: index === 0,
    }));
  }

  private filterBySearch(equipos: Equipo[], search: string): Equipo[] {
    const normalizedSearch = search.trim().toLocaleLowerCase();

    if (normalizedSearch.length === 0) {
      return equipos;
    }

    return equipos.filter((equipo) => {
      const nombre = equipo.nombre.toLocaleLowerCase();
      const marca = (equipo.marca ?? '').toLocaleLowerCase();
      return nombre.includes(normalizedSearch) || marca.includes(normalizedSearch);
    });
  }

  private filterByBrand(equipos: Equipo[], brandId: number | null): Equipo[] {
    if (brandId === null) {
      return equipos;
    }

    return equipos.filter((equipo) => equipo.marca_id === brandId);
  }

  private async loadMainImagesMap(equipoIds: number[]): Promise<Map<number, string>> {
    const validIds = equipoIds.filter((id) => Number.isFinite(id));

    if (validIds.length === 0) {
      return new Map<number, string>();
    }

    const { data, error } = await this.supabase
      .from('imagenes_equipo')
      .select('id,id_equipo,url_imagen')
      .in('id_equipo', validIds)
      .order('id_equipo', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      throw error;
    }

    const mainImageByEquipoId = new Map<number, string>();

    for (const row of (data ?? []) as Array<Pick<ImagenEquipoDbRow, 'id_equipo' | 'url_imagen'>>) {
      if (!mainImageByEquipoId.has(row.id_equipo)) {
        mainImageByEquipoId.set(row.id_equipo, row.url_imagen);
      }
    }

    return mainImageByEquipoId;
  }

  private mapEquipoRow(
    equipo: EquipoDbRow,
    brandsMap: Map<number, string>,
    mainImageMap?: Map<number, string>
  ): Equipo {
    const estadoMantenimiento = this.normalizeEstadoMantenimientoFromEstado(equipo.estado);

    return {
      id: equipo.id,
      nombre: equipo.nombre,
      marca_id: equipo.id_marca ?? null,
      marca: (equipo.id_marca ? brandsMap.get(equipo.id_marca) : null) ?? null,
      estado_mantenimiento: estadoMantenimiento,
      descripcion: equipo.descripcion,
      advertencias_tecnicas: equipo.advertencias,
      foto_principal_url: mainImageMap?.get(equipo.id) ?? null,
      activo: equipo.estado,
      created_at: equipo.created_at,
      updated_at: equipo.created_at,
    };
  }

  private async loadBrandsMap(marcaIds: Array<number | null>): Promise<Map<number, string>> {
    const validIds = Array.from(
      new Set(
        marcaIds.filter((id): id is number =>
          typeof id === 'number' && Number.isFinite(id)
        )
      )
    );

    if (validIds.length === 0) {
      return new Map<number, string>();
    }

    const { data, error } = await this.supabase
      .from('marcas')
      .select('id,nombre')
      .in('id', validIds);

    if (error) {
      throw error;
    }

    const map = new Map<number, string>();

    for (const marca of (data ?? []) as Array<{ id: number; nombre: string }>) {
      map.set(marca.id, marca.nombre);
    }

    return map;
  }

  private mapImagenEquipoRow(imagen: ImagenEquipoDbRow, index: number): EquipoImagen {
    return {
      id: imagen.id,
      equipo_id: imagen.id_equipo,
      url: imagen.url_imagen,
      alt_text: imagen.descripcion,
      orden: index + 1,
      es_principal: index === 0,
      created_at: imagen.created_at,
    };
  }

  private mapPasoRow(paso: PasoLimpiezaDbRow): PasoLimpieza {
    return {
      id: paso.id,
      equipo_id: paso.id_equipo,
      orden: paso.numero_paso,
      titulo: this.normalizeNullable(paso.titulo) ?? `Paso ${paso.numero_paso}`,
      descripcion: paso.descripcion,
      advertencias: null,
      created_at: paso.created_at,
      imagenes: [] as ImagenPaso[],
    };
  }

  private mapVideoRow(video: VideoEquipoDbRow | null): VideoEquipo | null {
    if (!video) {
      return null;
    }

    return {
      id: video.id,
      equipo_id: video.id_equipo,
      titulo: video.titulo,
      url_storage: video.url_video,
      created_at: video.created_at,
    };
  }

  private mapFichaTecnicaRow(ficha: FichaTecnicaDbRow | null): FichaTecnica | null {
    if (!ficha) {
      return null;
    }

    return {
      id: ficha.id,
      equipo_id: ficha.id_equipo,
      nombre_documento: ficha.nombre_documento,
      url_pdf: ficha.url_pdf,
      descripcion: ficha.descripcion,
      created_at: ficha.created_at,
    };
  }

  private mapEsterilizacionRow(
    esterilizacion: EsterilizacionEquipoDbRow | null
  ): EsterilizacionEquipo | null {
    if (!esterilizacion) {
      return null;
    }

    return {
      id: esterilizacion.id,
      equipo_id: esterilizacion.id_equipo,
      metodo: esterilizacion.metodo,
      temperatura: esterilizacion.temperatura,
      tiempo: esterilizacion.tiempo,
      observaciones: esterilizacion.observaciones,
      created_at: esterilizacion.created_at,
    };
  }

  private async resolveMarcaId(marcaNombre: string | null): Promise<number | null> {
    if (!marcaNombre) {
      return null;
    }

    const { data: existingMarca, error: existingMarcaError } = await this.supabase
      .from('marcas')
      .select('id, nombre')
      .ilike('nombre', marcaNombre)
      .limit(1)
      .maybeSingle();

    if (existingMarcaError) {
      throw existingMarcaError;
    }

    if (existingMarca?.id) {
      return existingMarca.id as number;
    }

    const { data: insertedMarca, error: insertError } = await this.supabase
      .from('marcas')
      .insert({ nombre: marcaNombre })
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }

    return insertedMarca.id as number;
  }

  private normalizeEquipoImages(images: EquipoImageInput[]): EquipoImageInput[] {
    const sanitized = images
      .map((imagen) => ({
        ...imagen,
        url: imagen.url.trim(),
        alt_text: this.normalizeNullable(imagen.alt_text),
      }))
      .filter((imagen) => imagen.url.length > 0)
      .sort((a, b) => a.orden - b.orden);

    const deduped: EquipoImageInput[] = [];
    const seenUrls = new Set<string>();

    for (const imagen of sanitized) {
      if (seenUrls.has(imagen.url)) {
        continue;
      }

      seenUrls.add(imagen.url);
      deduped.push(imagen);
    }

    const principalUrl =
      deduped.find((imagen) => imagen.es_principal)?.url ?? deduped.at(0)?.url ?? null;

    return deduped.map((imagen, index) => ({
      url: imagen.url,
      alt_text: imagen.alt_text,
      orden: index + 1,
      es_principal: principalUrl !== null && imagen.url === principalUrl,
    }));
  }

  private normalizeNullable(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeFichaTecnicaInput(
    ficha: FichaTecnicaInput
  ): FichaTecnicaInput | null {
    const normalized = {
      nombre_documento: this.normalizeNullable(ficha.nombre_documento),
      url_pdf: this.normalizeNullable(ficha.url_pdf),
      descripcion: this.normalizeNullable(ficha.descripcion),
    };

    return normalized.nombre_documento || normalized.url_pdf || normalized.descripcion
      ? normalized
      : null;
  }

  private normalizeEsterilizacionInput(
    esterilizacion: EsterilizacionEquipoInput
  ): EsterilizacionEquipoInput | null {
    const normalized = {
      metodo: this.normalizeNullable(esterilizacion.metodo),
      temperatura: this.normalizeNullable(esterilizacion.temperatura),
      tiempo: this.normalizeNullable(esterilizacion.tiempo),
      observaciones: this.normalizeNullable(esterilizacion.observaciones),
    };

    return normalized.metodo || normalized.temperatura || normalized.tiempo || normalized.observaciones
      ? normalized
      : null;
  }

  private normalizeEstadoMantenimientoFromEstado(estado: boolean): EstadoMantenimiento {
    return estado ? 'limpio' : 'pendiente';
  }
}
