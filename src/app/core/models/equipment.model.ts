export type EstadoMantenimiento = 'pendiente' | 'limpio' | 'en_proceso';

export interface Equipo {
  id: number;
  nombre: string;
  marca_id: number | null;
  marca: string | null;
  estado_mantenimiento: EstadoMantenimiento;
  descripcion: string | null;
  advertencias_tecnicas: string | null;
  foto_principal_url: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarcaEquipo {
  id: number;
  nombre: string;
  created_at: string;
  updated_at: string;
}

export interface EquipoImagen {
  id: number;
  equipo_id: number;
  url: string;
  alt_text: string | null;
  orden: number;
  es_principal: boolean;
  created_at: string;
}

export interface EquipoHistorial {
  id: number;
  equipo_id: number;
  accion: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'DELETED';
  cambios: Record<string, unknown>;
  actor_id: string | null;
  created_at: string;
}

export interface ImagenPaso {
  id: number;
  paso_id: number;
  url: string;
  alt_text: string | null;
  created_at: string;
}

export interface PasoLimpieza {
  id: number;
  equipo_id: number;
  orden: number;
  titulo: string;
  descripcion: string;
  advertencias: string | null;
  created_at: string;
  imagenes: ImagenPaso[];
}

export interface VideoEquipo {
  id: number;
  equipo_id: number;
  titulo: string | null;
  url_storage: string;
  created_at: string;
}

export interface FichaTecnica {
  id: number;
  equipo_id: number;
  nombre_documento: string | null;
  url_pdf: string | null;
  descripcion: string | null;
  created_at: string;
}

export interface EsterilizacionEquipo {
  id: number;
  equipo_id: number;
  metodo: string | null;
  temperatura: string | null;
  tiempo: string | null;
  observaciones: string | null;
  created_at: string;
}

export interface EquipoDetalle extends Equipo {
  imagenes_equipo: EquipoImagen[];
  pasos: PasoLimpieza[];
  video: VideoEquipo | null;
  ficha_tecnica: FichaTecnica | null;
  esterilizacion: EsterilizacionEquipo | null;
}

export interface EquipoInput {
  nombre: string;
  marca_id?: number | null;
  marca: string | null;
  estado_mantenimiento: EstadoMantenimiento;
  descripcion: string | null;
  advertencias_tecnicas: string | null;
  foto_principal_url: string | null;
  activo: boolean;
}

export interface EquipoImageInput {
  url: string;
  alt_text: string | null;
  orden: number;
  es_principal: boolean;
}

export interface StepImageInput {
  url: string;
  alt_text: string | null;
}

export interface PasoInput {
  orden: number;
  titulo: string;
  descripcion: string;
  advertencias: string | null;
  imagenes: StepImageInput[];
}

export interface VideoInput {
  titulo: string | null;
  url_storage: string;
}

export interface FichaTecnicaInput {
  nombre_documento: string | null;
  url_pdf: string | null;
  descripcion: string | null;
}

export interface EsterilizacionEquipoInput {
  metodo: string | null;
  temperatura: string | null;
  tiempo: string | null;
  observaciones: string | null;
}
